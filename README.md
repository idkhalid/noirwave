# Monochrome modification

This repository is a work-in-progress modification of [Monochrome](https://github.com/monochrome-music/monochrome), a web music player. The current work focuses on playback behavior, queue controls, recommendations, and the interface. It retains upstream code and attribution; this repository is not an official Monochrome release.

## Verified status

The [local runtime audit](docs/audit/02-runtime-validation.md) tested the application on `127.0.0.1` in headless Chrome. Search returned tracks, a provider stream returned HTTP 206 and the browser audio clock advanced. Pause, resume, seek, Next, Previous, queue add/remove, shuffle toggle, repeat mode selection, and queue/mode persistence were observed. These observations apply to that local session, endpoint, and date; they do not establish reliable playback on a public domain.

The follow-up audit observed repeat-all at natural completion and verified that the Repeat button reflects restored modes after reload. It also reproduced intermittent buffering during direct FLAC seeks. Local-file playback, queue drag-and-drop, Android, and public deployment remain unverified. See the audit for the full results and limitations.

## Prerequisites and local setup

- [Bun](https://bun.sh/) and Git.
- A modern browser. Browser tests also require Playwright and an available Chromium installation.
- Network access to the provider endpoints for provider-backed catalog and audio behavior. Availability and permission may vary.

From the repository root:

```bash
bun install --frozen-lockfile
bun run dev
```

Open the address printed by Vite, normally `http://localhost:5173/`. `bun.lock` is the committed dependency lockfile; keep it with `package.json`. Do not generate an npm lockfile for this setup.

Available checks include `bun run test:headless`, `bun run lint`, and `bun run build`. The build writes to `dist/`. These commands do not validate provider authorization or a public deployment.

## Provider and deployment limits

The active catalog and audio paths call external services, including Monochrome endpoints. The [source/API audit](docs/audit/01-source-api-audit.md) found no documented permission for this modified project's future public domain. Upstream documentation warns that official audio endpoints may allow only localhost and official domains, and that account services are domain restricted. A localhost stream test does not grant access for another domain. Public playback, self-hosted accounts, and Android support remain unverified; do not treat the Docker guide or the presence of Capacitor dependencies as proof that they work.

Use audio and provider services only where you have the necessary rights and access. Third-party media, artwork, fonts, and other assets may have separate terms from the source code license.

## Repository and documentation

- `src/`, `js/`, `index.html`, `styles.css`: application UI and playback code.
- `functions/`: serverless endpoints; `public/`, `images/`, `assets/`: shipped static assets.
- `database/`: PocketBase schema and its [local notes](database/README.md).
- `docs/`: [architecture](docs/Architecture.md), [implementation plan](docs/Implementation.md), [contributing guide](docs/CONTRIBUTING.md), [Docker guide](docs/DOCKER.md), [instances reference](docs/INSTANCES.md), [theme guide](docs/THEME_GUIDE.md), and this [cleanup report](docs/repository-cleanup.md).
- `docs/audit/`: source and runtime audit reports with reproduction scripts. Earlier audit entries are historical snapshots and may describe an older working tree.

The Docker and instances documents come from upstream and contain historical setup or endpoint information. Verify them against the current code and provider terms before relying on them.

## License and upstream attribution

The source is distributed under [Apache License 2.0](license). Original Monochrome code and copyright notices remain attributed to the [upstream project](https://github.com/monochrome-music/monochrome). Changes in this repository are independent modifications.
