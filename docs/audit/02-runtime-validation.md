# Stage 0 runtime validation — 2026-10-19

Status: **runtime baseline exercised** on localhost. The main flows below were tested by the agent in headless Chrome. Provider audio decoded and advanced; the user separately reported successful playback. No application source file was changed.

## Baseline and environment

- Commit: `86dc77aa5d1cfeebf78729211e87256800ff238d`, branch `main`.
- Working tree before and after testing: `bun.lock` modified and `AGENTS/` untracked. The lockfile diff updates resolved `@uimaxbai/am-lyrics` from `1.8.1` to `1.8.4`; this change preceded the agent's test. No tracked application source was modified.
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
| Repeat-all completion | BLOCKED | Mode `1` was enabled on the last of two tracks. A near-end seek stalled around four seconds before completion, so natural wraparound was not observed. |
| Queue and mode persistence after reload | PASS | Reload restored both queue entries, current index, and stored repeat mode. Playback did not automatically resume, which was not treated as a failure without a requirement to do so. |
| Repeat button after reload | FAIL | With stored repeat mode `1` or `2`, the button returned to title `Repeat` without its active class. The UI does not reflect the restored mode. |
| Local-file playback | N/A | No eligible local audio file was found in the checkout; provider playback was tested separately. |

## Browser errors and endpoint observations

- On an initial load, the unauthenticated session request to `auth.monochrome.st/api/auth/get-session` was blocked by CORS from `http://127.0.0.1:5173`. Guest search and playback still worked. No credentials or tokens were logged.
- The player reported `Invalid config, unrecognized key .streaming.jumpLargeGaps` during initial startup. Playback still advanced. This should be reviewed in the playback stabilization stage.
- Some supplementary `/artist/` requests returned HTTP `404`; search rows and stream playback succeeded independently.
- The browser observed search HTTP `200` and media HTTP `206`. Full media URLs, signed query strings, cookies, and tokens are intentionally absent from this report.

## Follow-up

1. In Stage 5, synchronize the Repeat button with restored queue state. The underlying mode persists, but the control appears off after reload.
2. Recheck repeat-all at natural completion on a stable stream. Queue drag-and-drop reordering remains untested.
3. In Stage 2, inspect the Shaka configuration warning and seek buffering; keep provider failures separate from player state behavior.
