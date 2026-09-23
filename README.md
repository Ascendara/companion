<div align="center">
  <img width="128" height="128" src="./readme/icon.png" alt="Ascendara">
  <h1>Ascendara Webview</h1>
  <p>Your Ascendara companion for mobile and desktop browsers.</p>
  <p>
    <a href="https://webview.ascendara.app/">Open the webapp</a> &middot;
    <a href="https://ascendara.app/">Ascendara</a> &middot;
    <a href="https://ascendara.app/discord">Discord</a>
  </p>
</div>

Ascendara Webview connects to your Ascendara desktop account through a six-digit code. Browse the latest game index, explore your synced library, follow downloads and extractions, and see which friends are around, all from one responsive app.

## What you can do

| View | Features |
| --- | --- |
| **Discover** | Search the latest index, filter by genre, and sort by recent updates, popularity, or name. |
| **Game details** | View artwork, descriptions, system requirements, size, version, update date, and online/DLC information when available. |
| **Library** | Browse your synced cloud library, filter favorites or completed games, and view playtime and achievement totals. |
| **Downloads** | Follow download progress, speed, remaining time, and extraction status. Pause, resume, or stop and remove supported downloads remotely. |
| **Friends** | Search friends and filter by online, away, busy, or offline status. |
| **Profile** | View account information and profile stats, choose an app-wide theme, or disconnect this browser. |

The interface uses a sidebar on desktop and bottom navigation on mobile. All 12 themes apply across the app. Appearance and connection settings live on **Profile**, with a desktop sidebar shortcut. A web app manifest and install prompt support adding the app to your device where the browser allows it.

Game installation and launching happen in the Ascendara desktop app. The webview displays catalog information and cloud data and provides the existing remote download controls; it does not install games on your phone or edit your cloud library.

## Connect your desktop

1. Open Ascendara on your desktop and generate a webview connection code.
2. Open [webview.ascendara.app](https://webview.ascendara.app/) and enter the six-digit code, or use the connection link provided by Ascendara.
3. Use the navigation to move between Discover, Library, Downloads, Friends, and Profile.
4. Open **Profile > Desktop connection > Disconnect** when you want to unlink this browser.

Both `/<six-digit-code>` and `/?code=<six-digit-code>` connection links are supported. The browser retains its monitor session between visits. Library data appears after cloud library sync in the desktop app; download activity depends on the desktop continuing to send updates.

Downloads poll every **10 seconds**, configured in [lib/config.ts](./lib/config.ts). Catalog and artwork loading use separate requests and caches.

## Run locally

The frontend uses **Next.js 16**, **React 19**, **TypeScript**, **Tailwind CSS 4**, Radix UI primitives, and Lucide icons.

Use Node.js 20.9 or newer and npm.

```bash
git clone https://github.com/ascendara/webview.git
cd webview
npm install
```

Create `.env.local` in the repository root if you want to configure the monitor API:

```dotenv
NEXT_PUBLIC_API_BASE_URL=https://monitor.ascendara.app
```

That URL is also the default when the variable is unset. For a local monitor deployment, use its reachable URL, for example `http://localhost:54303`. On a phone, `localhost` refers to the phone, so use the server's LAN address and allow the webapp's exact origin in the monitor's CORS configuration.

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000). A real connection code is required for account-backed views.

### Production build

```bash
npm run build
npm start
```

Set `NEXT_PUBLIC_API_BASE_URL` **before building**; Next.js includes public environment variables in the browser bundle. Rebuild when changing the endpoint. Serve production traffic over HTTPS and allow the frontend origin on the monitor API.

On Windows, use `npm.cmd` or `npx.cmd` if PowerShell's execution policy blocks the corresponding `.ps1` launcher.

### Mock downloads

During `npm run dev`, enter **`123456`** on the connection screen to open the simulated download dashboard. It includes sample downloads, progress updates, and local pause/resume/remove interactions.

Mock mode is a download-dashboard aid, not a complete account simulator. Discover, Library, Friends, and Profile do not have equivalent mock datasets wired into their current pages. Use a real paired session to exercise those views. Exit mock mode through **Profile > Disconnect**.

## How the services fit together

```text
Browser / installed webapp
  -> Monitor API (monitor.ascendara.app)
      -> Firebase account, device, friends, and cloud-library data
      -> Desktop download updates and command queue
      -> Ascendara game index
      -> Ascendara SteamGrid proxy -> artwork URLs
```

The frontend talks to the monitor API using the paired session. The monitor resolves the account owner and retrieves the data needed by each view. It reads the game index from `https://api.ascendara.app/json/games` and resolves artwork through Ascendara's SteamGrid proxy rather than the deprecated image endpoint.

### Catalog and artwork loading

- Discover and Library display **six games per page**. Discover keeps the search, genre, sort, and page in the URL so returning from details restores the results.
- The monitor caches the game index for **five minutes**. During an upstream outage it can return the last successful index for up to **one hour**, with the response marked stale.
- Artwork is requested for visible games in batches of **two**. The client reuses cached results, shares duplicate requests, and skips queued work for pages that are no longer active.
- The monitor allows one artwork batch at a time, bounds upstream work to a 12-second batch budget, and returns a retryable response when busy. The browser backs off instead of keeping server workers waiting.
- Successful artwork lookups are cached server-side for one day, empty results for six hours, and failed lookups for one minute. Missing artwork falls back to a placeholder.

### API routes used by the webview

These are the main browser-facing routes expected from the separately deployed monitor service, not the complete desktop/server API.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/verify-code` | Exchange a desktop connection code for a session. |
| `POST` | `/validate-session` | Check an existing session. |
| `GET` | `/getusername` | Retrieve the connected user's display name. |
| `GET` | `/downloads/<user_id>` | Retrieve desktop download activity. |
| `POST` | `/downloads/command` | Queue `pause`, `resume`, or `kill` for a download. |
| `POST` | `/get-friends` | Retrieve friends and presence information. |
| `POST` | `/disconnect-device` | Disconnect a paired device. |
| `GET` | `/companion/games` | Search and paginate catalog metadata. |
| `GET` | `/companion/games/<game_id>` | Retrieve one catalog entry. |
| `GET` | `/companion/account` | Retrieve profile and cloud-library data. |
| `GET` | `/companion/artwork` | Resolve artwork for game names. |

Companion routes require `X-Session-ID`, validate the connected device, and scope account reads to the session owner. Catalog responses exclude download links. Deploy the updated monitor API to enable these routes; a frontend update alone cannot add them to an older server.

## Monitor deployment and credentials

The monitor backend is maintained and deployed separately from this frontend repository. Its `monitor-api.py` service uses Flask and Waitress. Its entry point listens on port **54303**. It relies on the existing server deployment's Python dependencies, Firebase `serviceAccountKey.json`, and the `logger` and `crypto_utils` modules. Those support modules and credentials are not supplied as a standalone backend setup in this repository. Runtime state is persisted under `data/` in the server's working directory.

Artwork requests must satisfy the authentication policy of the upstream Ascendara API:

| Setting | Where it belongs | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Frontend build environment | Public monitor API URL. |
| `SECRET_KEY` | Monitor server environment | Shared signing secret matching the upstream API. |
| `ASCENDARA_SECRET_SEED` | Monitor server environment | Supported alternative to `SECRET_KEY`; takes precedence when both are set. |
| `ASCENDARA_BUILD_ID`, `ASCENDARA_BUILD_SIGNATURE`, `ASCENDARA_BUILD_VERSION`, `ASCENDARA_BUILD_TIMESTAMP` | Monitor server environment | Official build credentials when required by the upstream proxy. |
| `STEAMGRIDDB_API_KEY` | Upstream Ascendara API server | SteamGridDB credential used by the proxy, not by the browser. |
| `serviceAccountKey.json` | Monitor server filesystem | Firebase Admin service-account credential. |

Keep signing secrets, build credentials, SteamGridDB keys, and Firebase service-account data on the server. They must not be placed in `NEXT_PUBLIC_*` variables or committed to the repository.

The legacy API client supports encrypted payloads where the server supplies them. The newer `/companion/*` routes return session-authenticated JSON over HTTPS; the entire application should not be described as end-to-end encrypted.

See [companion deployment notes](./readme/companion-deployment.md) for rollout details. Firebase client access rules are maintained separately. The monitor accesses Firebase through the Admin SDK and must enforce its own session authorization.

## Checks

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Before deploying, pair a real device and check catalog search, artwork, synced library data, friends, session revocation, and desktop download commands against the target monitor server. Run backend checks in the monitor service repository.

## Project layout

```text
app/
  page.tsx                 Connection screen
  [code]/                  Six-digit connection-link redirect
  explore/                 Searchable game catalog
  games/[id]/              Game details
  library/                 Synced cloud library
  dashboard/               Desktop download monitoring
  friends/                 Friends and presence
  profile/                 Profile, appearance, and disconnect
  globals.css              Shared layout and theme palettes
  manifest.ts              Web app manifest
components/
  companion-layout.tsx     Shared companion page layout and artwork
  bottom-navbar.tsx        Desktop sidebar and mobile navigation
  download-card.tsx        Download progress and controls
  ui/menu-select.tsx       Custom filter and sort dropdowns
contexts/theme-context.tsx Theme selection and persistence
hooks/
  use-companion.ts         Companion data loading
  use-game-artwork.ts      Batched artwork requests and cache
lib/
  api.ts                   Legacy monitor session/download client
  companion.ts             Companion API client and data types
  config.ts                API URL and download polling interval
  themes.ts                Theme definitions
readme/                    Assets and companion deployment notes
```

## Troubleshooting

| Problem | What to check |
| --- | --- |
| Requests fail with `Failed to fetch` | Confirm the monitor is reachable, the build uses the intended API URL, and CORS permits the frontend origin plus `Content-Type` and `X-Session-ID`. An HTTPS frontend must not call an HTTP backend. |
| Downloads work but new pages return 404 | Deploy the monitor version that includes `/companion/*` routes. |
| Library is empty | Sync the cloud library from Ascendara desktop. The view reads `users/{uid}.cloudLibrary`. |
| Artwork is missing | Check monitor logs, upstream signing/build credentials, and proxy availability. The browser does not need a SteamGridDB key. |
| Artwork is slow or the monitor reports queue pressure | Keep the current pagination and batch limits; inspect upstream latency and the deployed monitor version. Artwork lookups are deliberately throttled. |
| A session is expired or revoked | Reconnect with a fresh desktop code. |
| The landing-page availability indicator disagrees with a custom API | Its current status probe targets `https://monitor.ascendara.app` directly, independently of `NEXT_PUBLIC_API_BASE_URL`. |

## License and community

Licensed under [MIT](./LICENSE). Copyright 2026 tagoWorks.

[Ascendara](https://ascendara.app/) | [Discord](https://ascendara.app/discord) | [tagoWorks](https://tago.works) | [Email](mailto:santiago@tago.works)
