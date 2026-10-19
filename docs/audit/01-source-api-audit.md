# Stage 1 source and API audit — 2026-10-19

Status: **PASS** for static source mapping; **BLOCKED** for runtime access verification. Audited commit `86dc77aa5d1cfeebf78729211e87256800ff238d`. File references below are source evidence, not claims of live endpoint success.

## Dependency map

`index.html:150-151` loads `js/app.js` and `styles.css`. `js/app.js:8-32` imports `MusicAPI`, `Player`, router, UI, IndexedDB, and account modules; `js/app.js:433-438` initializes player and renderer. `js/router.js:5-13` handles navigation. `src/main.tsx:1-19` contains a separate Preact route shell, but no reference to it was found in `index.html`; the active entry is the legacy DOM application. `vite.config.ts:1-8,28-44` configures Vite/PWA and browser tests. `src/styles/modern.css` is imported by the alternate shell, while `styles.css` serves the active entry.

`MusicAPI` in `js/music-api.js:59-130` coordinates Tracks Streamer, Apple Music search, LosslessAPI, and podcasts. `LosslessAPI` in `js/api.js:105-316` chooses configured instances for its catalog and related-track operations and may use native TIDAL requests or fall back. `Player` in `js/player.js` resolves a source from `MusicAPI`, controls queue and playback, and saves queue state. `smart-recommendations.js:4-171` ranks or filters provider candidates using `listening-tracker.js`; `db.js` and `storage.js` persist library/history and settings.

## Feature → source → provider/access → result

| Feature | Source evidence | Provider and required access | Verification |
| --- | --- | --- | --- |
| Search and catalog | `js/music-api.js:116-130`, `js/tracks-api.js:449-518`, `js/api.js:681-916`, `js/apple-music-api.js:751-773` | Browser calls `tracks.monochrome.st`, then Apple Music catalog and TIDAL/HiFi fallbacks. Requires endpoint availability and CORS. | Static path verified; live requests BLOCKED. |
| Track metadata | `js/api.js:1761-1781`, `js/tracks-api.js:647-718` | HiFi `/info/?id=` or Tracks Streamer release/artist endpoints. | Static path verified. |
| Related tracks | `js/api.js:1783-1830`, `js/api.js:1591-1643` | TIDAL mix requests through `tidal-proxy.monochrome.tf` (`js/proxy-utils.js:13`), then artist tracks as fallback. | Static path verified; availability unknown. |
| Artwork | `js/HiFi.ts:1809,2022-2024`; `js/apple-music-api.js:799-820` | TIDAL resources CDN and optional same-origin Apple video cover function. | Static path verified; rights and runtime unknown. |
| Lyrics | `js/lyrics.js:115-140,491` | Genius via AllOrigins and LRCLIB. | Static path verified; runtime unknown. |
| Audio source | `js/player.js:1506,1844`, `js/music-api.js:489-505`, `js/tracks-api.js:782-808,818-891` | Active `MusicAPI` path resolves a direct `https://tracks.monochrome.st/track/:id` FLAC URL. A separate `LosslessAPI` dev-mode method can use configured `/trackManifests/` (`js/api.js:1832-1856`), but this is not the active `MusicAPI.getStreamUrl` path. Provider permission, CORS, Range support, and target-domain access remain unverified. | Static path verified; playback BLOCKED. |
| Alternate playback | `js/api.js:2473-2587`, `js/storage.js:3193-3251` | Unified playback code includes Turnstile and `/api/v2/track/`, but `isEnabled()` returns `false`; this is not an active fallback. | Static path verified. |
| Queue, repeat, autoplay | `js/player.js:437-529,2054-2150,2325-2418,2601-2681`; `js/storage.js:2210-2231` | Local queue; related-track requests for autoplay. Queue persisted in localStorage. | Static path verified; behavior untested. |
| Listening signals | `js/listening-tracker.js:1-154`, `js/db.js:79-81,167-220` | Local storage and IndexedDB. No server required for guests. | Static path verified; behavior untested. |
| Accounts and sync | `js/accounts/config.js:4-27`, `js/accounts/pocketbase.js:7-13,745-771` | Better Auth at `auth.monochrome.st` and PocketBase/data API at `data.monochrome.st`; independent fork authorization is not established. | Static path verified; self-hosted sync unknown. |
| Local files | Upstream `README.md` Features at audit time; `index.html:2354-2396` | User-owned local files; viable separate player test source once runtime is available. | UI source found; behavior untested. |

## Behavior gaps against Architecture.md

- `js/api.js:1639-1643` randomizes recommendation candidates with `Math.random`; `js/smart-recommendations.js:45-46` randomizes seeds. The proposed deterministic weighted scoring and discovery ratio do not exist yet.
- `js/listening-tracker.js:122-124` returns `null` for track metadata, preventing its internal artist-affinity update calls at `93-95` and `110-112`. `js/events.js:542-548,589-593` separately calls `updateArtistAffinity` on transitions and completion, so artist updates are not entirely absent. There is no playback ID or event ID. Its completion/skip thresholds at `1-5,145-151` differ from the target architecture. `onTimeUpdate` uses position deltas under five seconds (`70-79`), which needs runtime checks around pauses and seeks.
- `js/player.js:2054-2150` uses a queue index plus radio/autoplay extension. Repeat-one is handled in `playNext` without an explicit user-Next distinction. `js/player.js:2350-2418` appends fetched recommendations after asynchronous work without a seed generation check. These paths need targeted Stage 5 tests before claiming target queue semantics.
- `js/api.js:2791-2846` caches stream results in memory by ID/quality without an explicit expiry, but the active `MusicAPI.getStreamUrl` implementation uses Tracks Streamer directly (`js/music-api.js:489-505`). The direct `/track/:id` URL may be stable; any future manifest-derived source needs expiry-aware handling.
- `js/storage.js:3193-3251` contains a disabled unified playback branch. Do not infer availability from dormant code.

## Deployment and license decision

The upstream README Self-Hosting section explicitly warns that official audio endpoints accept localhost and official domains only, and that self-hosted accounts are unavailable. The code does not establish access for this project's future public domain. **Decision: public playback is BLOCKED pending a provider/endpoint with documented permission for the target domain.** Local development can proceed with permitted test audio or a self-owned collection. A new provider adapter may be required after that provider is selected; a custom backend is not justified by the static audit alone.

`package.json` declares Apache-2.0 and `license` contains the Apache 2.0 text. Rights to artwork, provider media, fonts, and third-party assets need separate verification before distribution. No access-control bypass was attempted.

## Reusable integration locations and next checks

Reuse `MusicAPI` as the provider boundary, `TracksStreamerAPI` for active source resolution where access is permitted, `LosslessAPI` for current catalog and recommendation paths, `Player` for playback, `db.js`/`storage.js` for guest state, and the existing router/UI. Keep catalog metadata and audio resolution separate. Once dependencies are available, verify search, permitted audio playback, seek/Range, errors, URL expiry, reload, and account behavior in a browser; capture network status and timing without recording tokens or signed URLs.
