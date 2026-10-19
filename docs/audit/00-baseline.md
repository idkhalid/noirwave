# Stage 0 baseline — 2026-10-19

Status: **BLOCKED** for runtime playback validation. Source baseline is established.

## Repository and environment

- Commit: `86dc77aa5d1cfeebf78729211e87256800ff238d`, branch `main`, remote `https://github.com/monochrome-music/monochrome.git`.
- The working tree initially held only untracked `AGENTS/` documents; all 288 tracked files were absent. The tracked files were restored from `git archive HEAD` without changing `.git` or the documents. `git restore --worktree -- .` failed because `.git/index.lock` could not be created under the workspace permissions.
- Runtime: Node `v22.23.3`, npm `12.1.0`; Bun is unavailable. The only lockfile is `bun.lock`. `package.json` declares Vite and Vitest scripts. `CONTRIBUTING.md` allows npm, but there is no npm lockfile.
- `node_modules` is absent. `npm install --no-package-lock --ignore-scripts --offline` failed with `ENOTCACHED` for `@capacitor/android`. npm's configured offline mode is `true`; an attempt with `--offline=false` failed with `ECONNREFUSED` at the configured sandbox proxy (`127.0.0.1:9`). No second lockfile was created. `npm run dev` failed because `vite` is unavailable.
- `node --check` passed for `js/app.js`, `js/player.js`, `js/api.js`, `js/smart-recommendations.js`, and `js/listening-tracker.js`. This is syntax evidence only.

## Feature baseline

| Feature | Result | Evidence |
| --- | --- | --- |
| App starts locally | BLOCKED | `npm run dev`: `vite` not recognized; dependencies unavailable. |
| Search | BLOCKED | No browser runtime; static path in `js/music-api.js:116` and `js/tracks-api.js:449`. |
| Playback | BLOCKED | No browser runtime or confirmed permitted media endpoint. |
| Pause/resume | BLOCKED | No browser runtime. |
| Seek | BLOCKED | No browser runtime. |
| Next/Previous | BLOCKED | No browser runtime. |
| Queue | BLOCKED | No browser runtime. |
| Shuffle/repeat | BLOCKED | No browser runtime. |
| Reload persistence | BLOCKED | No browser runtime. |

## Next step

Install dependencies with the upstream Bun lockfile when Bun and package access are available, start Vite, and execute the manual feature matrix above. If provider playback fails, test the player with media the project is permitted to use and record that separately from provider success.
