# Architecture — Monochrome Custom Music App

Date: October 18, 2026  
Status: target architecture; not a completed source-code audit.  
Base repository: https://github.com/monochrome-music/monochrome

## 1. Goal

Customize Monochrome with personalized recommendations, relevant next-song selection, and a UI/UX inspired by Spotify and YouTube Music. Start with a localhost web application, then deploy to a public domain, and build Android support after playback is stable.

Build an independent recommendation algorithm. Identical results to proprietary Spotify/YouTube Music algorithms are not a requirement or a promise. Use an original visual identity without copying their logos or branded assets.

## 2. Known Constraints and Initial Decisions

The reviewed README describes streaming API restrictions to official instances, a localhost exception, and limitations on self-hosted accounts. Verify the actual implementation and behavior at the selected commit. An Apple Music search integration does not establish that audio comes from Apple Music.

Initial decisions:
- Fork and retain the upstream stack; do not rewrite before auditing it.
- Do not download or store the entire FLAC catalog.
- Do not assume official instance endpoints will support production deployment.
- Start with deterministic recommendation scoring; machine learning is not required for the MVP.
- Add a custom backend only for requirements that upstream does not satisfy.
- Module names, API contracts, and data models below are proposals, not claims about existing repository files.

## 3. Target Components

| Component | Responsibility |
| --- | --- |
| Monochrome Web/PWA | Search, home, library, player, lyrics, and queue |
| Playback/Queue Controller | Playback state, repeat, shuffle, manual queue, and autoplay |
| Recommendation Engine | Candidate retrieval, personalized scoring, diversification, and fallback |
| Provider Adapter | Catalog normalization and audio-source resolution |
| Local User Store | History, feedback, preferences, and recommendation cache |
| Optional Backend | Provider secrets, accounts/sync, event ingestion, and server recommendations |
| Catalog/Audio Provider | Metadata and media with confirmed access and permitted use |

Main flow: the UI requests candidates through the adapter; the engine ranks recommendations; the queue selects the next track; the controller resolves its playback source and plays it. Playback events update the local or server-side profile.

Metadata, artwork, lyrics, and audio may use different providers. Verify availability, usage limits, and compatibility separately.

## 4. Providers and Playback

Conceptual adapter contract:

```ts
interface MusicProvider {
  search(query: string): Promise<Track[]>;
  getTrack(id: string): Promise<Track>;
  getRelatedTracks(id: string, limit: number): Promise<Track[]>;
  resolvePlayback(id: string): Promise<PlaybackSource>;
}
```

Finalize this contract after the source audit. If related tracks are unavailable, generate candidates from available metadata/library data. Namespace identifiers by provider to prevent collisions.

PlaybackSource includes a URL/manifest, MIME type, optional expiration, and quality information. Resolve temporary URLs close to playback time; do not persist them as permanent sources.

Prefer direct provider streaming when permitted. Proxy audio only when necessary and permitted, with Range/seek support, timeouts, bandwidth limits, and egress-cost measurement. The backend must not become an open proxy.

Use bounded retries and clear errors. Do not skip indefinitely through failed tracks. Manual playback and queue operations must remain usable when recommendations fail.

## 5. Minimum Data Model

| Entity | Core Fields |
| --- | --- |
| Track | provider, track_id, title, artist_ids, album_id, duration_ms, optional genres |
| ListeningEvent | event_id, profile_id, playback_id, track_ref, event_type, position_ms, listened_ms, timestamp, reason |
| Feedback | profile_id, track_ref, like/dislike, updated_at |
| UserProfile | profile_id, artist_affinity, genre_affinity, updated_at |
| QueueEntry | entry_id, track_ref, origin: manual/context/autoplay |
| RecommendationCache | profile_id, seed_ref, candidate_refs, expiry, algorithm_version |

Guests use local identities; cross-device accounts are a separate stage. IndexedDB is a candidate local store, but reuse upstream storage if adequate. Choose a server database only after auditing accounts and synchronization.

Distinguish user skips, seeks, pauses, track changes, natural completion, and network errors. Deduplicate event_id and finalize playback_id once. listened_ms measures actual listening time, not the position reached through seeking.

## 6. MVP Recommendations

1. Retrieve candidates from provider-related tracks, preferred artists/genres, the library, and available discovery sources.
2. Normalize identifiers and remove duplicates.
3. Exclude the seed, blocked/unavailable tracks, and tracks already in the queue.
4. Score candidates using available signals.
5. Apply diversification and cooldowns.
6. Cache briefly; invalidate when the seed or feedback changes.

Initial configurable formula:

```text
score = 0.35 * seed_similarity
      + 0.25 * artist_affinity
      + 0.15 * genre_affinity
      + 0.15 * positive_history
      + 0.10 * exploration
      - skip_penalty - repetition_penalty
```

Normalize all signals to 0..1. These weights are initial hypotheses, not evaluated results. Remove unavailable signals and renormalize positive weights; do not fabricate genres, BPM, moods, or audio embeddings.

Initial parameters:
- Early skip: an explicit user-initiated transition within the first 30 seconds; errors are not dislikes.
- Positive completion: listening to at least 80% of the duration, counted once per playback.
- Avoid tracks played within the last 20 tracks and artists within the last 3 tracks when enough candidates exist.
- Target approximately 20% discovery when relevant candidates exist; do not sample randomly from the entire catalog.
- Cold start: use the seed and explicit user choices; use editorial/popular fallbacks only if a source exists.

For small candidate pools, relax artist cooldown first, then recent-history cooldown. Never reintroduce blocked tracks or create unbounded loops. If no candidates remain, stop with a clear empty state.

## 7. Queue and Next-Song Semantics

- Prioritize the manual queue, then the active album/playlist context, then autoplay after that context ends.
- Repeat-one repeats on natural completion; an explicit Next action still advances.
- Repeat-all repeats the active context rather than extending autoplay indefinitely.
- Shuffle applies to the selected context while preserving manual queue priority and Previous history.
- Previous follows actual playback history.
- Disabling autoplay stops playback when the queue/context ends.
- Cancel or ignore stale recommendation responses after seed changes. Allow only one next-track transition per playback.
- Prefetch metadata and resolve sources near playback time. Prefetch audio only when permitted by the provider.

## 8. Target UI/UX

Desktop: navigation sidebar, personalized home with continue-listening sections, persistent bottom player, and queue/lyrics panels.

Mobile: bottom navigation, mini player, now-playing screen, and accessible queue controls. Preserve keyboard support, focus states, screen-reader labels, contrast, and loading/error/empty states.

Keep UI components separate from provider and recommendation logic. Preserve playback during navigation. Do not redesign the entire UI before queue behavior is verified.

## 9. Deployment and Android

Local development does not require owning a full audio catalog. Public deployment requires endpoints available for the target domain, HTTPS, appropriate CORS, server-side secret handling, and an explicit account/synchronization decision.

Evaluate Capacitor as an Android wrapper after the web application is stable; finalize the approach after compatibility testing. WebView does not remove API restrictions. Test background playback, lock-screen controls, audio focus, incoming calls, and lifecycle behavior on physical devices; native integration may be necessary.

## 10. Operations and Scope Limits

Measure playback success, time to first audio, empty recommendations, next-track latency, and early skips. Do not log signed URLs, tokens, or sensitive account data. Provide history/profile deletion. Separate application offline caching from offline audio storage.

Outside the MVP: a complete FLAC catalog, large ML models, DRM implementation, bulk downloading, and public distribution before media access is ready. Size infrastructure using measurements rather than catalog assumptions.

## 11. References and Validation

- Repository/README: https://github.com/monochrome-music/monochrome
- The source audit must record the commit SHA, file:line evidence, dependencies, and discovered endpoints.
- Verify code/asset licenses and provider requirements at the selected version before distribution.
- Implementation.md defines execution order and completion criteria.

## 12. UI/UX Reference Collection

Maintain a growing reference collection before selecting the final design. References inform individual interaction patterns; no single reference automatically becomes the complete product specification.

| Reference | Intended Use | Verification Status |
| --- | --- | --- |
| Spotify / YouTube Music | Navigation, discovery, player, queue, and library interaction references | Evaluate selected flows before adoption |
| https://github.com/dhunanyan/spotify-clone/blob/master/README.md | User-supplied Spotify React Native UI reference; candidate mobile layout and interaction inspiration | Source reviewed at commit 7d8ea36ed230c1ec75c15cacb61a3771d357f80a; see Section 13 |

For every additional reference, record its URL, relevant screens/flows, screenshots where available, strengths, weaknesses, accessibility considerations, and the specific patterns proposed for adoption. Compare alternatives per flow rather than declaring one application universally best.

React Native references do not change the current web/PWA architecture or commit the Android application to React Native. Translate selected patterns into the existing web stack first. Reuse source code/assets only after checking license and framework compatibility; otherwise implement the interaction independently.

Finalize a coherent design system during Stage 6. Resolve conflicting navigation, spacing, typography, and player behaviors rather than combining unrelated screens without a shared interaction model.

## 13. Verified Source Review — dhunanyan/spotify-clone

Reviewed October 18, 2026, at commit `7d8ea36ed230c1ec75c15cacb61a3771d357f80a` on `master`. Scope: static inspection of source, dependencies, routes, API helpers, and representative UI components. No installation, device execution, visual rendering, or live Spotify API testing was performed. The earlier retrieval failure is resolved by cloning the repository.

Source baseline: https://github.com/dhunanyan/spotify-clone/tree/7d8ea36ed230c1ec75c15cacb61a3771d357f80a

### Stack and License

`package.json:3,30-61` declares Expo Router, Expo ~51.0.37, React 18.2.0, React Native 0.74.5, Reanimated, gesture-handler, expo-image, and gradients. These are inspected versions, not upgrade recommendations. `app/(tabs)/_layout.tsx:1-11` defines Home, Search, and Library tabs. The README states that web is unsupported despite a dev:web script; do not assume browser compatibility.

`LICENSE:1-13` is MIT, copyright 2024 dhunanyan. Retain its copyright and permission notice when copying substantial code. That license does not independently establish rights to Spotify branding, external artwork, or provider media.

### Patterns Worth Adapting

| Pattern | Source Evidence | Decision for Monochrome |
| --- | --- | --- |
| Three-tab mobile navigation with labels and selected state | `navigators/BottomTabBar/BottomTabBar.tsx:16-103` | Adapt Home/Search/Library information architecture; use web routing and accessible link semantics |
| Section-based home | `components/Home/index.tsx:25-35` | Adapt recently played, albums, artists, and playlists as independently loaded sections |
| Reusable horizontal shelves | `components/Slider/Slider.tsx:16-79` | Adapt shelf/card composition; implement functional Show All and bounded/virtualized rendering when needed |
| Shape-aware cards with artwork fallbacks | `components/Card/Card.tsx:11-87` | Adapt square album/playlist and circular artist cards, truncation, fallback images, and entity navigation |
| Filtered library grid | `components/Library/Library.tsx:26-128` | Adapt category selection and scroll reset; replace fixed three-column layout with responsive sizing |
| Album/playlist detail composition | `components/Preview/Preview.tsx:89-141` | Adapt cover, summary, track list, related content, and credits as separate components |
| Scroll-reactive artwork and header | `components/Preview/Cover/Cover.tsx:44-95`; `components/Preview/CommonHeader/CommonHeader.tsx:33-87` | Optional web animation; support reduced motion and verify scrolling performance |
| Artwork-derived background | `components/Background/Background.tsx:25-39` | Adapt blur/dark-overlay treatment with contrast checks and a cheaper fallback |
| Browse category tiles | `components/Search/BrowseCategory/BrowseCategory.tsx:16-40` | Adapt visual layout only; implement actual category routes and stable colors |

These are source-derived design candidates, not a rendered visual-quality verdict. Validate final choices through mockups and interaction testing.

### Verified Limitations — Do Not Import as Working Features

- Recommendations are disabled: `api/recommendations/getRecommendations.ts:18-19` throws `Temp error` before its API call. Home also comments out two recommendation sections at `components/Home/index.tsx:29-34`. This is not a ready recommendation engine.
- Search UI is incomplete: `components/Header/Header.tsx:35-49` contains a search-box placeholder. The Search component renders browse categories; category routing remains TODO at `components/Search/BrowseCategory/BrowseCategory.tsx:22`.
- Inspected track rows are presentational: `components/Preview/Track/Track.tsx:43-105` renders a View with save/more Pressables that have no onPress handlers. No track-play callback is exposed in its props at lines 16-26. Do not treat its playing indicator as proof of audio playback.
- Save/download animation is not persistence: `components/Preview/Summary/AnimatedPressable/AnimatedPressable.tsx:37-42` only changes animation state. `components/Preview/Summary/Summary.tsx:64-68` hardcodes the download indicator active.
- Show All has no handler in `components/Slider/Slider.tsx:40-45`. The profile menu is TODO in `components/Header/Header.tsx:25-27`.
- Several reviewed tests are skipped TODO placeholders, including `components/Preview/__tests__/Preview.unit.test.tsx:2-3` and `components/Preview/Cover/__tests__/Cover.unit.test.tsx:2-3`. Test presence alone does not establish coverage.
- No complete playback/queue/background-audio implementation was established in this review. Preserve Monochrome's playback controller; do not infer a complete streaming app from README marketing.
- API coupling: recommendation code targets Spotify and user data is retrieved through API helpers. It does not supply a replacement audio endpoint for Monochrome.
- Client secret handling must not be copied: `api/config/getSessionlessToken.ts:33-45` reads clientSecret from Expo configuration and sends client credentials from app code; `api/config/getSessionToken.ts:10-19` similarly uses a secret for refresh. Use a provider-appropriate public-client flow or server-side confidential credentials in our implementation.

### Architecture Decision

Accept this repository as a mobile browsing/detail UI reference. Adapt the information hierarchy and selected visual patterns into Monochrome's existing stack. Do not migrate to React Native, replace the provider, or reuse unfinished playback/recommendation/auth behavior because of this reference. Keep mini player, now-playing controls, queue, and desktop behavior open for additional references.
