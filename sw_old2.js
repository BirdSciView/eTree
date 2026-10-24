/* Understory — service worker
   Caches the app shell (this page, its icons, Leaflet, fonts) so the app can
   open with no connection at all, and caches map tiles as they're viewed so
   previously-seen areas of the map stay visible offline. Firestore's own
   offline persistence (enabled in index.html) handles the tree *data* —
   this file is only responsible for the app *shell* and map imagery.
*/
const SHELL_CACHE = 'understory-shell-v1';
const TILE_CACHE = 'understory-tiles-v1';
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== SHELL_CACHE && k !== TILE_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // never intercept writes

  const url = req.url;

  // Let Firestore-style backends manage their own traffic, and never cache
  // Apps Script API calls — the app's own JS layer (localStorage cache +
  // pending-action queue) handles the offline fallback for those, and a
  // stale cached response here would mean stale trees forever.
  if (url.includes('firestore.googleapis.com') || url.includes('googleapis.com') || url.includes('google.com')) {
    return;
  }
  if (url.includes('script.google.com') || url.includes('script.googleusercontent.com')) {
    return;
  }

  // Map tiles: cache-first, refresh in the background, fall back to cache when offline.
  if (url.includes('tile.openstreetmap.org') || url.includes('server.arcgisonline.com')) {
    event.respondWith(
      caches.open(TILE_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req).then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => null);
        return cached || (await network) || new Response('', { status: 503 });
      })
    );
    return;
  }

  // Everything else (this page, Leaflet, fonts, the Firebase SDK files, icons):
  // cache-first, network fallback, and cache new successful responses as they come in.
  event.respondWith(
    caches.open(SHELL_CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      } catch (err) {
        return cached || new Response('Offline and not yet cached.', { status: 503 });
      }
    })
  );
});
