# Stage 0 runtime validation — 2026-10-19

Status: **runtime baseline and follow-up exercised** on localhost. The main flows below were tested by the agent in headless Chrome. Provider audio decoded and advanced; the user separately reported audible playback. The initial baseline made no application source changes; the follow-up made two small source edits described below.

## Baseline and environment

- Commit: `86dc77aa5d1cfeebf78729211e87256800ff238d`, branch `main`.
- Working tree during the initial baseline: `bun.lock` modified and `AGENTS/` untracked. The lockfile diff updates resolved `@uimaxbai/am-lyrics` from `1.8.1` to `1.8.4`; this change preceded the agent's test. During the follow-up, the user reorganized documentation under `docs/` and had other unrelated working-tree changes. The agent changed only `js/events.js`, `js/player.js`, and the follow-up audit files under `docs/audit/`.
- Bun `1.4.3` is installed at the Winget package path, although the agent shell's PATH does not resolve `bun`. Node.js is `v22.23.3`; Vite reports `v7.3.1`; dependencies are present in `node_modules`. No npm lockfile was created.
- `AGENTS.md` does not exist in this checkout. The requested README, `package.json`, `bun.lock`, and earlier audit reports were read in the preceding Stage 0 attempt.
- Browser: installed Google Chrome launched headlessly through Playwright, desktop viewport `1440 × 900`, fresh browser context for each run. The reproducible interaction scripts are `docs/audit/runtime-probe.mjs` and `docs/audit/runtime-queue-probe.mjs`.

## Commands and access

```powershell
git status --short
git rev-parse HEAD
& 'C:\Users\Khalid\AppData\Local\Microsoft\WinGet\Packages\Oven-sh.Bun_Microsoft.Winget.Source_8wekyb3d8bbwe\bun-windows-x64\bun.exe' --version
& 'C:\Users\Khalid\AppData\Local\Microsoft\WinGet\Packages\Oven-sh.Bun_Microsoft.Winget.Source_8wekyb3d8bbwe\bun-windows-x64\bun.exe' run dev -- --host 127.0.0.1
node docs/audit/runtime-probe.mjs
node docs/audit/runtime-queue-probe.mjs
```

The first Vite attempt failed in the restricted process sandbox with `spawn EPERM` while starting esbuild. Running the same command with approved process access succeeded: Vite served `http://127.0.0.1:5173/`. The first Chrome attempt likewise hit `spawn EPERM`; the approved run succeeded. These are environment restrictions, not application test failures. The agent did not rerun dependency installation because `node_modules` was already present and `bun.lock` had a pre-existing change.

## Agent-observed results

| Feature | Result | Evidence and limit |
| --- | --- | --- |
| Local app startup | PASS | Vite served the page; Chrome received HTTP `200` and initialized the app. |
| Search | PASS | Searching `Daft Punk` displayed nine track rows. The Tracks Streamer `/search` response was HTTP `200`. Early test attempts submitted before app initialization and timed out; the final script waits until initialization, then search succeeded. |
| Provider playback | PASS | Clicked the first result. `tracks.monochrome.st/track/...` returned HTTP `206`; the browser audio element had `error: null`, `readyState: 4`, `paused: false`, duration about 320 seconds, and advancing `currentTime`. The agent did not claim to hear headless audio. The user independently reported successful playback. |
| Pause and resume | PASS | Player button changed audio `paused` from `false` to `true` and back; `currentTime` advanced again on resume. |
| Seek | PASS | Clicking the middle of the progress bar moved playback from about 8 seconds to about 159–160 seconds. A successful run resumed with `readyState: 4` and no media error. Some seeks temporarily entered a buffering state. |
| Next | PASS | With two queued tracks, Next moved the queue index from `0` to `1`, changed the playing title from `One More Time` to `Get Lucky`, and advanced the second audio stream. |
| Previous | PASS | At more than three seconds, Previous restarted the current track. A second Previous near its start moved from queue index `1` to `0` and played the prior track. |
| Queue add and display | PASS | Used the second search result's context menu `Add to queue`. Stored queue length changed from `1` to `2`; the Queue panel displayed both titles in order. |
| Queue removal | PASS | Removed the third item while shuffle was active. The active shuffled queue and saved original order fell from three to two; turning shuffle off left a two-track queue and playback running. |
| Queue reordering | BLOCKED | Drag-and-drop reordering was outside this baseline's required controls. |
| Shuffle toggle | PASS | Clicking Shuffle set `shuffleActive: true` and the button's `active` class. Clicking again restored `false`. |
| Shuffled playback order | PASS | With three tracks, one run produced the saved order `One More Time → Instant Crush → Get Lucky`; Next played `Instant Crush` at shuffled index `1`. A second run happened to retain original order, which is possible with random shuffle. This verifies use of the shuffled queue, not shuffle quality. |
| Repeat mode cycle | PASS | Button clicks changed stored mode `0 → 1 → 2 → 0`, with corresponding Repeat Queue and Repeat One UI states before reload. |
| Repeat-one completion | PASS | In one run, after seeking near the end, the same track restarted around two seconds with queue index unchanged and mode `2`. A later run stalled while buffering near the end; repeat behavior should be checked again under a stable connection. |
| Repeat-all completion | PASS | Follow-up: on the last of two 23-second provider tracks, the browser emitted a real `ended` event at 22.96 seconds. The queue index changed from `1` to `0`, and the first track began playing again with `readyState: 4`, `paused: false`, and no media error. No end-of-track seek or synthetic `ended` event was used. |
| Queue and mode persistence after reload | PASS | Reload restored both queue entries, current index, and stored repeat mode. Playback did not automatically resume, which was not treated as a failure without a requirement to do so. |
| Repeat button after reload | PASS | Follow-up: mode `1` restored the `Repeat Queue` title and active class; mode `2` restored `Repeat One`, active, and `repeat-one` after app initialization. The immediate DOM snapshot after reload can precede event initialization and briefly show the default title. |
| Seek reliability | FAIL | Follow-up: a direct FLAC track remained in `seeking: true`, `readyState: 1`, with no media error 10 seconds after a midpoint seek and 15 seconds after a 99% seek. Both requests returned HTTP `206`; buffered ranges did not yet include the requested playback position. Earlier midpoint seeks did recover, so the failure is intermittent. |
| Local-file playback | N/A | No eligible local audio file was found in the checkout; provider playback was tested separately. |

## Browser errors and endpoint observations

- On an initial load, the unauthenticated session request to `auth.monochrome.st/api/auth/get-session` was blocked by CORS from `http://127.0.0.1:5173`. Guest search and playback still worked. No credentials or tokens were logged.
- The initial browser run reported `Invalid config, unrecognized key .streaming.jumpLargeGaps`. The installed Shaka 5 configuration defines gap detection settings but no `jumpLargeGaps` key. Removing the invalid key stopped this warning in the follow-up browser run. The tested FLAC stream has `playbackType: direct` and uses `prepareNativePlayback`, so Shaka's warning was separate from its seek behavior.
- Some supplementary `/artist/` requests returned HTTP `404`; search rows and stream playback succeeded independently.
- The browser observed search HTTP `200` and media HTTP `206`. Full media URLs, signed query strings, cookies, and tokens are intentionally absent from this report.

## Follow-up validation, 2026-10-19

Commands: `bun run dev -- --host 127.0.0.1` (Bun executable from the Winget path above), `node docs/audit/runtime-followup.mjs`, `node docs/audit/runtime-seek-probe.mjs`, `node node_modules/eslint/bin/eslint.js js/events.js js/player.js`, and `node --check` on both changed source files. Vite and Chrome required the same approved process access as the initial baseline. ESLint and syntax checks passed. The browser probes use fresh contexts, do not log signed stream URLs or tokens, and do not save audio files.

`js/events.js` now applies the saved Repeat mode to the desktop button when player events initialize and reuses the same update on click. `js/player.js` no longer passes the unsupported `streaming.jumpLargeGaps` option to Shaka. No dependency or lockfile was changed by this follow-up.

For repeat-all, the short provider track on the last queue item ran from the beginning to the browser's `ended` event at 22.96 seconds. The player immediately requested the first queued item and advanced its audio clock. A media HTTP `206` response was observed for the restarted track. The agent observed browser decoding and state transitions, not sound output; the user separately confirmed audible playback on localhost. Public-domain access remains unverified.

For seek, the 320.36-second direct FLAC stream returned HTTP `206` with byte ranges starting at `0`, `19660800`, and `39616512` in a 40,572,194-byte resource. At 10 seconds after seeking to about 159 seconds, the browser remained `seeking: true`, `readyState: 1`, and its buffered range ended around 161.7 seconds. At 15 seconds after seeking to about 316 seconds, the buffered range ended around 315.1 seconds, before the requested position. No media error or failed range response was observed. This establishes a native-media buffering stall in this run; it does not prove whether provider throughput, browser FLAC indexing, or both caused it. No Shaka warning appeared in this run.

## Next steps

1. Investigate direct FLAC seek reliability with provider response timing and browser media diagnostics. Keep this separate from DASH/HLS Shaka behavior.
2. Queue drag-and-drop reordering remains untested. Public-domain playback remains unverified.
