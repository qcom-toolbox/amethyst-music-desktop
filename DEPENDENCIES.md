# Dependency audit

Every dependency in this project was picked deliberately to keep the supply chain
small and auditable. This file is the record of *why* each one is here — before
adding a new dependency, ask whether the same job can be done with what's already
listed (Node/Electron builtins, or one of these) first.

## Runtime dependencies (`dependencies`)

| Package | Why |
|---|---|
| `react` | UI rendering for the renderer process. Maintained by Meta, extremely high scrutiny, effectively no surprise transitive dependencies. |
| `react-dom` | DOM renderer for React. Same trust profile as `react`. |

That's the entire runtime dependency list. No HTTP client library (native `fetch`
is available in both the main process and the Chromium renderer), no state
management library (React context + hooks cover this app's needs), no UI kit, no
icon library (icons are hand-written inline SVG in
[`src/renderer/components/icons.tsx`](src/renderer/components/icons.tsx)), no
date/utility library (`lodash`, `dayjs`, etc.).

## Dev dependencies (`devDependencies`)

| Package | Why |
|---|---|
| `electron` | The desktop runtime itself. |
| `electron-builder` | Packages the app into a `.dmg`/`.exe`/`.AppImage`/`.deb`. Pulls a nontrivial transitive tree, but it's the de facto standard for Electron packaging (used by thousands of production apps) and is far more scrutinized than any smaller/newer alternative. |
| `vite` | Bundles the renderer. Also used only at build time — never shipped in the app. |
| `@vitejs/plugin-react` | Vite's official React plugin (JSX transform + Fast Refresh in dev). |
| `typescript` | Type-checking and compiling `src/main`/`src/preload`. |
| `@types/node`, `@types/react`, `@types/react-dom` | Type declarations only — erased at build time, ship nothing at runtime. |

## Explicitly avoided, and what's used instead

- **`keytar`** (credential storage) — unmaintained, ships a native module per
  platform (bigger attack surface, harder to audit at a glance). Replaced with
  Electron's built-in [`safeStorage`](https://www.electronjs.org/docs/latest/api/safe-storage)
  API, which is already part of Electron and backed by the OS keychain
  (Keychain / DPAPI / libsecret). See [`src/main/credentials.ts`](src/main/credentials.ts).
- **`discord-rpc` / `@xhayper/discord-rpc`** (Discord Rich Presence) — both are
  small, low-scrutiny third-party packages for something that's really just ~150
  lines of framing over a local socket. Replaced with a hand-rolled client using
  only Node's built-in `net` module. See [`src/main/discordRpc.ts`](src/main/discordRpc.ts).
- **`axios`** — native `fetch` is available everywhere this app runs (Node 18+/Electron
  main, and the Chromium renderer).
- **`concurrently` / `wait-on` / `electron-vite`** (dev tooling) — replaced with a
  ~70-line hand-rolled dev orchestrator, see [`scripts/dev.mjs`](scripts/dev.mjs).
- **A router library** — this app has ~5 screens; a small `useState`-based route
  object in [`src/renderer/App.tsx`](src/renderer/App.tsx) is enough.

## Ongoing hygiene

- `pnpm-lock.yaml` is committed; `.npmrc` sets `save-exact=true` so every version
  bump is a deliberate, reviewable change (no `^`/`~` ranges).
- **[`pnpm-workspace.yaml`](pnpm-workspace.yaml) sets `minimumReleaseAge: 10080`
  (7 days).** This is a pnpm 11+ feature that refuses to install any package
  version published more recently than that — most malicious or compromised
  npm publishes are caught and unpublished within hours to a few days, so this
  closes off a real, common supply-chain attack path (a version that looks
  fine today but gets pulled next week never makes it into this project) with
  zero ongoing effort. Every direct dependency above was deliberately checked
  against the npm registry's publish timestamps before being pinned so it
  already clears this bar.
- The same file also lists a small, reviewed `minimumReleaseAgeExclude` for
  specific fast-moving *transitive* dependencies (Rollup's official
  per-platform binaries, browser-data packages like `caniuse-lite`, etc.) that
  ship new patches every few days from trusted maintainers — without the
  exclusion, a same-week `pnpm install` would be flaky depending on exactly
  when they last published. Direct dependencies are never in this list.
- `pnpm-workspace.yaml`'s `allowBuilds` explicitly allow-lists which packages
  may run install-time lifecycle scripts at all (pnpm 11 blocks every other
  package's scripts by default) — currently just `esbuild` (picks its own
  prebuilt binary; needed by Vite). `electron-winstaller`'s script is
  explicitly left disabled since this project doesn't use the Squirrel
  Windows installer target.
- CI runs `pnpm install --frozen-lockfile` (never installs anything not already
  locked, and re-verifies the whole lockfile against the policies above on
  every run) and `pnpm audit --audit-level=high` (fails the build on
  high/critical advisories) on every push — see
  [`.github/workflows/build.yml`](.github/workflows/build.yml).
- CI also uploads the full resolved dependency tree (`pnpm list --depth=Infinity`)
  as a build artifact on every run, so the whole tree — not just direct
  dependencies — stays visible.
- Before adding any new dependency: check its weekly download count, last publish
  date, number of maintainers, and open security advisories, and prefer a
  built-in Node/Electron/Web API over a package whenever one exists.
