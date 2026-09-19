# Understory — WRDSB Schoolyard Tree Map

A collaborative tree-mapping app for Waterloo Region District School Board
students and teachers: suggest trees on a map, vote on their details, see
estimated ecological benefits, and track a school leaderboard — built to run
as a free static site on **GitHub Pages**, backed by a **Google Sheet**, with
**offline support** for students without mobile data.

This README covers the two things you need to do before it works:
1. Turn a Google Sheet into the app's shared database.
2. Publish the site on GitHub Pages.

---

## 1. Why a Google Sheet?

The map needs to be shared live between every student and teacher using the
app, which a static site can't do on its own — it needs somewhere to store
data. A Google Sheet was chosen (instead of, say, Firebase) because:

- Everything lives in Google Drive, which WRDSB already uses — no separate
  cloud console, billing page, or account to set up.
- A teacher can open the sheet directly to see every tree as plain rows,
  sort/filter it, or fix something by hand if they ever need to.
- It's free, with no usage-based billing to worry about.

The trade-off, to be upfront about it: a Sheet can't *push* updates to
everyone instantly the way a real database can. This app instead checks the
sheet for changes every 20 seconds while it's open (and right after you take
an action yourself), so other people's changes appear within about 20
seconds rather than instantly. For a classroom project, that's a reasonable
trade for the much simpler setup.

## 2. Set up the Google Sheet (10 minutes)

1. Go to <https://sheets.google.com> and create a new blank spreadsheet.
   Name it something like **Understory Tree Data**.
2. In the menu, click **Extensions → Apps Script**. A new tab opens with a
   default `Code.gs` file containing a `myFunction(){}` stub.
3. Select all the default code and delete it, then paste in the entire
   contents of **`Code.gs`** from this folder. Click the save icon (or
   Ctrl/Cmd+S).
4. Click **Deploy → New deployment**.
   - Click the gear icon next to "Select type" and choose **Web app**.
   - **Description**: anything, e.g. `Understory API`.
   - **Execute as**: `Me`.
   - **Who has access**: `Anyone`. *(If your school Google Workspace domain
     blocks "Anyone," choose "Anyone within [your domain]" instead — see the
     note in Section 5 about what that changes.)*
   - Click **Deploy**.
5. The first time, Google will ask you to authorize the script — click
   **Authorize access**, choose your account, and click **Advanced → Go to
   [project name] (unsafe)** if a warning screen appears (this is expected
   for a script you wrote yourself) → **Allow**.
6. Copy the **Web app URL** it gives you — it looks like:

   `https://script.google.com/macros/s/AKfycb.../exec`

7. Open `index.html` in this folder, find the section near the top of the
   `<script type="module">` block labeled **GOOGLE SHEET BACKEND SETUP**,
   and replace `"YOUR_APPS_SCRIPT_WEB_APP_URL"` with the URL you just copied.

That's it — the script automatically creates a `Trees` tab with the right
column headers the first time it runs, so you don't need to set up the sheet
by hand.

**Re-deploying later:** if you ever edit `Code.gs` (to change a formula,
add a column, etc.), you need to click **Deploy → Manage deployments →
edit (pencil icon) → Version: New version → Deploy** for the changes to take
effect — saving the file alone isn't enough for an existing deployment.

## 3. Publish on GitHub Pages (5 minutes)

1. Create a new **public** GitHub repository (e.g. `wrdsb-tree-map`).
2. Add these files from this folder to the repository root (you don't need
   to upload `Code.gs` — that one lives in the Apps Script editor, not on
   GitHub):
   - `index.html`
   - `sw.js`
   - `manifest.json`
   - `icon-192.png`
   - `icon-512.png`
   - `README.md`
3. Commit and push them to the `main` branch.
4. In the repository, go to **Settings → Pages**.
5. Under **Build and deployment → Source**, choose **Deploy from a branch**.
6. Under **Branch**, choose `main` and folder `/ (root)`, then **Save**.
7. Wait a minute or two, then refresh the Pages settings screen — it will
   show your live URL, something like:

   `https://YOUR-GITHUB-USERNAME.github.io/wrdsb-tree-map/`

Share that link with students and teachers. It needs to be served over
HTTPS for the offline service worker to work, which GitHub Pages provides
automatically.

## 4. How the offline mode works

- **First visit must be online once.** That first load downloads the app
  itself and installs a small "service worker" that caches it on the device.
  After that, the app opens even with zero signal — no wifi, no data.
- **Suggesting a tree or voting while offline** still works: the change
  applies immediately on-screen, and is queued on the device. The moment the
  device is back online, the app automatically sends everything it queued,
  in order, to the sheet. An "You're offline" banner appears at the top so
  students know what's happening.
- Queued changes are sent as small edits (e.g. "add one agree vote"), not
  as a full overwrite of the tree — so if two students each vote on the same
  tree while both offline, both votes still count correctly once they sync,
  rather than one overwriting the other.
- **Map tiles** (the visual map images) are cached as students browse, so
  areas they've already looked at stay visible offline; brand-new areas they
  haven't panned to yet will look blank until they're back online.
- If a device has *never* successfully loaded the app before (e.g. a
  brand-new phone that's always been offline), there's nothing to work from
  yet — it needs one successful connection first.

## 5. A few things worth knowing

- **Open access, like before.** Anyone with the site link can suggest trees
  and vote — same as the earlier version of this app. Because the Apps
  Script is deployed with "Anyone" access, that also means anyone who
  discovered the Apps Script URL directly (not just the site) could call it.
  There's no login system, matching the classroom-passcode approach used for
  the teacher view. If you'd rather restrict this, using "Anyone within
  [your domain]" in step 2 requires people to be signed into a WRDSB Google
  account to use the app at all, which is a reasonable middle ground.
- **Apps Script quotas.** Google gives each account a daily quota for Apps
  Script web app calls (generous, but not unlimited). With the default
  20-second poll interval, a class of ~30 students with the app open for a
  full school day stays comfortably within normal limits; if you deploy this
  board-wide with hundreds of simultaneous users, consider raising
  `POLL_INTERVAL_MS` in `index.html` (e.g. to 30000 or 45000).
- **Not instant.** Other people's changes show up within about 20 seconds
  (one poll cycle), not immediately. Your own actions always show up
  instantly on your own screen.

## 6. About the ecological estimates

The CO₂, O₂, and shade figures shown for each tree are calculated
automatically from its species, height, and trunk diameter using standard,
widely taught urban-forestry approximations (not a substitute for a
professional tree inventory tool). Each tree's detail panel has a "How is
this calculated?" link explaining the formulas in plain language — a good
discussion starting point for a class.

## 7. Customizing

- **Teacher passcode**: search `index.html` for `TEACHER_PASSCODE` and
  change `"wrdsb-trees"` to something else. This is a lightweight classroom
  gate, not secure authentication.
- **Poll frequency**: `POLL_INTERVAL_MS` near the top of the script.
- **School list, species list, growth rates, wood densities**: all defined
  near the top of the `<script type="module">` block in `index.html`.
- **Map starting location/zoom**: search for `setView` inside `initMap()`.
- **Sheet columns**: defined in the `COLUMNS` array at the top of `Code.gs`
  — if you add a column, add its name there too.

## 8. If something doesn't look right

- Blank grey map / tiles not loading: usually a first-load-while-offline
  situation, or (if you're viewing this inside a Claude conversation
  preview rather than on GitHub Pages) that preview environment blocks
  live map tile loading — this is expected there and resolves once
  deployed to GitHub Pages, which has no such restriction.
- "This app isn't connected to a Google Sheet yet" banner: the Apps Script
  URL in `index.html` still has the placeholder value — see step 2.7 above.
- Votes or new trees not showing up for others: give it 20 seconds (the
  poll interval); if it's still missing after that, check that the Apps
  Script deployment is on its latest version (see the re-deploying note in
  Section 2) and that "Execute as: Me" is still set.
