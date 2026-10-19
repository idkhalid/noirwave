# Implementation — Monochrome Custom Music App

Date: October 18, 2026  
Status: implementation plan; no source changes or runtime tests have been completed.  
Reference: [Architecture.md](Architecture.md).

## Execution Rules

Complete stages in order. Retain the upstream stack, make small changes, and record validation evidence. Proposed modules do not describe the current repository structure. Avoid rewrites, new backend services, or authentication changes until the source audit establishes a need.

Local development can continue using available sources. Public launch requires suitable API/audio access and a working account strategy.

## Stage 0 — Clone and Establish a Local Baseline

Prerequisites: Git and the Node/Bun runtime required by package.json and the selected commit's lockfile.

```powershell
git clone https://github.com/monochrome-music/monochrome.git
cd monochrome
git switch -c custom-music-app
git rev-parse HEAD
```

Read README, CONTRIBUTING, applicable AGENTS.md files, package.json, and the lockfile. Use the upstream package manager; do not introduce a second lockfile without justification. If the project uses Bun:

```powershell
bun install --frozen-lockfile
bun run dev
```

If npm is supported and an npm lockfile exists, use npm ci. Otherwise, follow upstream npm installation instructions and review resulting lockfile changes. Do not arbitrarily change dependency versions to hide errors.

Manually test search, playback, pause/resume, seek, next/previous, queue, shuffle/repeat, and reload. Record existing failures before modifying code.

Deliverable: docs/audit/00-baseline.md with the commit, runtime, commands, and PASS/FAIL/BLOCKED results per feature. Never report PASS without evidence.

Complete when the application runs locally and playback status is known. If the media source fails, document the cause and use permitted test audio to validate the player without claiming provider success.

## Stage 1 — Audit APIs and Source Code (Read-Only)

Use rg and file inspection to trace:
- Entry points, routing, UI components, and stylesheets.
- Player, queue, autoplay, recommendations, and state persistence.
- Search/catalog endpoints, related tracks, artwork, lyrics, and audio URLs/manifests.
- Browser versus server requests; tokens, cookies, CORS, URL expiry, and failover.
- Authentication, local storage, synchronization backends, and environment/configuration.
- Localhost/domain restrictions, self-hosting support, and code/asset licenses.

Separate source facts, runtime observations, and unknowns. Do not guess the audio source or test access-control bypasses.

Deliverable: docs/audit/01-source-api-audit.md containing feature → file:line → provider → required access → verification result. Include a dependency map and reusable components.

Required decision:
1. Available endpoints support the target deployment, or
2. A new adapter/provider is required, or
3. Public playback is BLOCKED; development continues with test audio or a self-owned collection.

Complete when catalog and audio paths are documented separately, integration locations are established, and backend requirements can be decided. The audit does not require code changes.

## Stage 2 — Stabilize Providers and Playback

Implement the minimum adapter justified by the audit. Retain existing code when adequate. Add environment configuration, timeouts, consistent errors, and expired-URL refresh handling.

Keep secrets server-side if required. Introduce a thin backend only when necessary; do not proxy audio by default. Never commit tokens or signed URLs.

Test normal and unavailable tracks, timeouts, expiry, seeking, rapid transitions, and provider failures. Use mocks/fixtures for failure cases that cannot be reproduced reliably.

Deliverable: docs/done/02-provider-playback.md.

PASS: baseline playback has no regression, errors do not trigger infinite skipping, and temporary URLs are not treated as permanent. Public deployment remains BLOCKED if target-domain endpoints are unavailable.

## Stage 3 — Listening Events and Local Profiles

Reuse upstream storage; add only necessary fields/entities. Implement playback_id and event_id, start/progress/end/skip/error/like/dislike events, and artist/genre affinity aggregation.

Measure actual listening time. Seeking to the end is not completion; pauses and errors are not dislikes. Progress events must not create additional listens. Finalize each playback once.

Support guests without login. Do not replace upstream authentication in this stage. Provide history and profile reset.

Test persistence/reload, duplicate events, pause/resume, seeks, network failures, and profile isolation.

Deliverable: docs/done/03-listening-profile.md.

PASS: events are deduplicated, feedback updates the profile, and deletion works.

## Stage 4 — MVP Recommendation Engine

Implement candidate retrieval, provider-ID normalization, Architecture.md scoring, filtering, cooldowns, discovery, and fallback. Optional metadata must not become a mandatory dependency.

Provide configurable weights, algorithm_version, deterministic fixtures, and internal selection reasons for debugging. Retain upstream fallbacks where useful.

Meaningful tests:
- New users receive candidates from available seed data.
- Likes/skips change ranking in controlled fixtures.
- The same track is deduplicated across candidate sources.
- Blocked/unavailable tracks are excluded.
- Missing metadata and small catalogs do not crash or loop.
- User profiles remain isolated.

Deliverable: docs/done/04-recommendation-engine.md.

PASS: fixture ranking changes are measurable and fallbacks work. Functional tests do not establish Spotify-level relevance; evaluate relevance through actual listening.

## Stage 5 — Next-Song and Queue Integration

Implement manual queue → playlist/album context → autoplay priority. Apply repeat-one, repeat-all, shuffle, Previous, and autoplay-off semantics from Architecture.md.

Use request tokens/generations to prevent stale responses from overwriting a new seed. Prevent duplicate transitions when ended events and Next clicks occur together. Users must be able to edit the queue while recommendations load.

Test empty queues, context completion, repeat/shuffle, repeated Next clicks, simultaneous ended/click events, seed changes, slow/failed requests, and unavailable tracks.

Deliverable: docs/done/05-next-song-queue.md.

PASS: recommendations do not overwrite manual entries, each action produces one transition, autoplay-off stops correctly, and failure handling does not loop. Record recommendation-fetch and next-song latency; separate provider resolution from local scoring.

## Stage 6 — Desktop and Mobile UI/UX

Define design tokens and a small mockup first. Implement home/search/library, desktop sidebar/mobile bottom navigation, mini player, now-playing screen, queue, and lyrics where available.

Use Spotify/YT Music interaction patterns as references while retaining original branding/assets. Do not replace the playback engine during visual changes.

Test 360, 390, 768, and 1440 px viewports; keyboard/focus behavior, accessibility labels, loading/error/empty states, navigation during playback, and player/queue synchronization.

Deliverable: docs/done/06-ui-ux.md with screenshots, validation results, and limitations.

PASS: primary controls work on mobile/desktop, disruptive overflow is absent, and playback persists during navigation.

## Stage 7 — Public Domain and Accounts

Prerequisites: the target-domain provider is ready, audio access is understood, and account requirements are decided.

Configure HTTPS, CORS for the intended origin, server-side secrets, rate limits for custom endpoints, and logs without sensitive tokens/URLs. Do not assume official-instance accounts work on a fork.

If synchronization is required, select a self-hostable backend after the audit; implement authentication, per-user authorization, and synchronization without duplicated history. Otherwise, release guest/local-first behavior and document per-device data limits.

Test search/playback, seeking, expiry, reload, and optional authentication on the actual domain. Run available build/lint/typecheck/test scripts from package.json; do not invent script names.

Deliverable: docs/done/07-public-domain.md with RELEASE READY or BLOCKED status and supporting evidence.

PASS: the actual domain works with suitable endpoints, bundles/logs contain no secrets, and user-data storage behavior is explicit.

## Stage 8 — Android

After web playback is stable, evaluate Capacitor or a native approach based on the audit. Configure package ID, minimum permissions, and signing. Endpoints remain necessary; wrapping the app does not change provider permissions.

Test on physical devices: background/locked-screen playback, audio focus, wired/Bluetooth headsets, incoming calls, network changes, process termination, and notification controls. Add native plugins/services where the browser layer is insufficient.

Deliverable: docs/done/08-android.md and a test APK if the build environment is available.

PASS: core playback is stable on tested devices. Do not claim background playback is complete based only on browser or emulator tests.

## Reporting Requirements

Record changed files, reasons, commands/checks actually executed, results, limitations, and the next step. Use PASS/FAIL/BLOCKED/N/A. Exclude credentials, account dumps, and signed URLs from reports.

Current priority: Stages 0 and 1. Do not download the FLAC catalog, purchase large storage, or redesign the UI before integration audit results are available.

## UI/UX Reference Collection — Ongoing Workstream

Collect references during the baseline and audit stages without blocking playback/API work. This is an input to Stage 6, not authorization to migrate frameworks.

Initial user-supplied reference:
https://github.com/dhunanyan/spotify-clone/blob/master/README.md

Status: source reviewed at commit 7d8ea36ed230c1ec75c15cacb61a3771d357f80a on October 18, 2026. See the verified review and adoption tasks below.

Maintain docs/design/ui-ux-references.md when working inside the cloned repository. For each reference, capture:
- URL, inspected commit/date, framework, and license verification status.
- Relevant screen or flow: home, search, library, now playing, queue, or navigation.
- Evidence from inspected code/screenshots and any behavior that remains unknown.
- Strengths, weaknesses, accessibility, mobile ergonomics, and implementation cost.
- Decision: adopt, adapt, reject, or pending; include the reason.

Before Stage 6 implementation, compare candidates per flow and create a small coherent mockup using the chosen patterns. Prioritize playback visibility, queue clarity, navigation consistency, accessibility, and responsive behavior over visual resemblance alone.

Acceptance criteria:
- No reference is described as inspected unless its contents were actually reviewed.
- Selected patterns have explicit reasons and a consistent design system.
- React Native code is not assumed to work in the web stack.
- Any proposed React Native migration requires a separate architecture decision covering cost and playback/background requirements.
- Source/assets are not copied before license and compatibility checks.

## Verified Reference Review and Stage 6 Tasks

Reference: https://github.com/dhunanyan/spotify-clone/tree/7d8ea36ed230c1ec75c15cacb61a3771d357f80a  
Reviewed commit: `7d8ea36ed230c1ec75c15cacb61a3771d357f80a`. Method: static source review only; no dependency installation, tests, live API checks, or device rendering. Architecture.md Section 13 contains the detailed file:line evidence and limitations.

### Adopt/Adapt Backlog

| Task | Reference | Completion Criteria |
| --- | --- | --- |
| Mobile Home/Search/Library navigation | `app/(tabs)/_layout.tsx`; `navigators/BottomTabBar/BottomTabBar.tsx` | Correct selected state, accessible labels, history/back behavior, safe-area spacing, and room for persistent player |
| Section-based home and shelves | `components/Home/index.tsx`; `components/Slider/Slider.tsx` | Independent loading/error/empty states; Show All navigates; long catalogs do not render without bounds |
| Shared entity cards | `components/Card/Card.tsx` | Album/playlist squares, artist circles, image fallbacks, stable IDs, working routes, and responsive dimensions |
| Library filtering | `components/Library/Library.tsx` | Functional filter selection, correct results, deliberate scroll reset, responsive grid, no fixed viewport-height assumptions |
| Album/playlist detail composition | `components/Preview/Preview.tsx` | Header, cover, summary, track list, credits, and related content share the existing data/player contracts |
| Artwork/header transitions | `components/Preview/Cover/Cover.tsx`; `components/Preview/CommonHeader/CommonHeader.tsx` | Reduced-motion fallback, readable header, measured scroll performance, stable layout |
| Browse category tiles | `components/Search/BrowseCategory/BrowseCategory.tsx` | Real category navigation, stable color per category, readable text, keyboard/touch support |

### Required Corrections When Adapting

1. Keep the custom recommendation engine from Stage 4. The reference helper throws `Temp error` before requesting recommendations (`api/recommendations/getRecommendations.ts:18-19`).
2. Implement a real search input, results, loading/error states, and stale-request handling. The reference search box is a placeholder (`components/Header/Header.tsx:35-49`).
3. Connect track clicks, play/pause, queue actions, and playing indicators to Monochrome's actual playback state. Reference track rows do not expose a playback callback (`components/Preview/Track/Track.tsx:16-26,43-105`).
4. Drive likes/saved/download indicators from real persisted state. Reference AnimatedPressable only animates (`components/Preview/Summary/AnimatedPressable/AnimatedPressable.tsx:37-42`), and the summary download indicator is hardcoded active (`components/Preview/Summary/Summary.tsx:64-68`). Hide unsupported download controls.
5. Implement Show All, category navigation, and menus instead of copying inert controls. Validate every visible primary action manually.
6. Do not reuse app-bundled client-secret handling from `api/config/getSessionlessToken.ts:33-45` or `api/config/getSessionToken.ts:10-19`. Keep confidential credentials server-side; select authentication according to the actual provider.
7. Add meaningful interaction tests for implemented flows rather than copying skipped TODO tests. Run Monochrome's existing regression checks after UI integration.
8. Preserve MIT notices if substantial code is reused; separately verify external assets. Reimplement native UI patterns in the web stack rather than copying framework-specific components blindly.

### Remaining Reference Gaps

Continue collecting references for the mini player, full now-playing screen, queue editing, next-song transitions, desktop layout, and background playback UX. This source review does not establish complete implementations for those areas.

Stage 6 review output must link the pinned source references, distinguish implemented behavior from visual inspiration, include rendered screenshots of our implementation, and report actual tests. Source review alone is not visual or runtime validation.
