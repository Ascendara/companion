# Ascendara companion deployment

The webapp includes cloud library (`/library`) and profile (`/profile`) views.
Discover (`/explore`) searches the latest index, with game details at `/games/:id`.
Downloads and friends remain at their existing URLs. Six-digit connection links
continue to work.

The browser only stores the monitor `X-Session-ID`. Do not put
`STEAMGRIDDB_API_KEY`, `SECRET_KEY`, `CLIENT_TOKEN_SECRET`, or a Firebase
service-account credential in the mobile webapp. The API source uses
`STEAMGRIDDB_API_KEY` internally for the SteamGrid proxy, and its direct
account endpoints use Firebase ID tokens; the companion monitor keeps those
server-side and scopes account reads from the connected session.

## Monitor API

The monitor backend is maintained separately from this frontend repository.
Deploy its updated `monitor-api.py` to the existing monitor server alongside
its existing dependencies, Firebase credentials, and `crypto_utils`/`logger`
modules. The webapp's `NEXT_PUBLIC_API_BASE_URL` must point to that server.
The existing deployment's CORS allowlist must include the webapp origin.

New routes authenticate `X-Session-ID`, check the connected device in Firestore,
and scope account reads to the session owner. They do not accept a client UID
or write profile stats, subscriptions, or library data. No Firestore rule
changes are required. The friends route fills the gap in the supplied API file.

Library artwork is resolved by `/companion/artwork`. The monitor signs requests
to Ascendara's SteamGrid proxy with the same rotating HMAC method. Set the
monitor's `SECRET_KEY` to the API's `SECRET_KEY`; `ASCENDARA_SECRET_SEED` is
also supported for desktop-compatible deployments. The monitor caches
successful results for one day, empty results for six hours, and failures for one minute and returns only the selected image
URL to the browser. Keep these variables only on the monitor server; never add
them to a `NEXT_PUBLIC_*` setting. If the upstream proxy requires official build verification, also provide
`ASCENDARA_BUILD_ID`, `ASCENDARA_BUILD_SIGNATURE`, `ASCENDARA_BUILD_VERSION`,
and `ASCENDARA_BUILD_TIMESTAMP` from the official Ascendara build.

## Game index

Deploy the updated monitor API alongside the webapp to enable
`GET /companion/games` and `GET /companion/games/:id`. The monitor reads
`https://api.ascendara.app/json/games`, caches it for five minutes, and serves
6 results per page. Recently updated is the default sort; search, genre, sort,
and page are kept in the browser URL so returning from details restores results.
An upstream outage can use the last successful index for up to an hour, clearly
labeled as stale. No local catalog file or new environment variables are needed.

Game IDs are preserved when present, with stable title-based IDs for older
entries that only have `imgID`. Images are resolved by game name using the
existing `/companion/artwork` flow, in small batches for the current page.
Both Discover and Library show six games at a time and resolve two covers per
request. Cached covers are reused; queued lookups for previous pages are skipped.
The monitor allows one artwork batch at a time, returns a retryable 503 for
contention, and bounds upstream lookups to a 12-second batch budget. Browser
backoff replaces retries that used to hold Waitress workers. Larger legacy
batches return unfinished names in `pending` for a later request.
No deprecated image routes are used. Catalog responses expose metadata and
requirements, not download links. Game installation continues on desktop.

## Account data

Library data comes from `users/{uid}.cloudLibrary`, matching desktop's cloud
sync implementation; playtime is stored in seconds. Profile levels come from
the backend-managed `users/{uid}.profileStats`. Empty libraries prompt users
to sync on desktop. Installing or launching games still happens in desktop;
the webapp retains existing remote pause, resume, and cancel controls.

## Verification

Run `npm run build`, `npx tsc --noEmit`, and `npm run lint` for the frontend.
Run the monitor API tests in its separate backend checkout.
Before release, pair a real device and verify the catalog, synced library,
friends, revocation, and download commands against the deployed monitor API.
