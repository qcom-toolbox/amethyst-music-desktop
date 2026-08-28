# Amethyst Music Desktop

The official Electron desktop client for self-hosted [Amethyst Music](https://github.com/qcom-toolbox/Amethyst-Music)
servers (a PHP/MySQL music server, forked from Purple Music). It loads the
server's own real web UI directly — full feature parity for free, since it's
the actual app — and adds the things a plain browser tab can't: a saved-server
picker, secure auto-login, OS media controls, and Discord Rich Presence.

## How it works

There's no reimplementation of the music app itself. The window either shows
a small native "choose a server" screen, or — once you pick one — the real
`index.php` from that server, exactly as your browser would render it. Two
small "tweaks" are layered on top of that, both driven from the main process
by reading the page's own DOM (never by modifying its code):

- **Auto-login**: on the server's login page, if a saved credential exists
  for it, the app fills in the real form and clicks the real login button.
  The first time you log in manually, it offers (via a native dialog) to
  save that login for next time — encrypted with your OS keychain
  (Keychain / DPAPI / libsecret via Electron's `safeStorage`), never in
  plain text. See [`src/main/webIntegration.ts`](src/main/webIntegration.ts).
- **OS media controls**: the same script wires the page's `#mainAudio` element
  up to the standard Web `MediaSession` API — that's what gets you the macOS
  Control Center "Now Playing" widget, media keys, and AirPods controls, for
  free from Chromium (also works on Windows' SMTC and Linux's MPRIS, no extra
  code). Play/pause act on the real audio element directly; previous/next call
  the page's own `prevTrack()`/`nextTrack()` — the same functions its own
  buttons call.
- **Discord Rich Presence**: the same script polls the page's own now-playing
  elements (`#mainAudio`, `#play-title`, `#play-status`, `#player-cover`)
  every few seconds and reports them back to the main process, which updates
  your Discord status — including the *actual* track's cover art, passed
  straight through as an image URL (the same technique Spotify's own Discord
  integration uses; no pre-uploaded "Art Asset" needed) — over a hand-rolled
  IPC client (no `discord-rpc` package). See
  [`src/main/webIntegration.ts`](src/main/webIntegration.ts) and
  [`src/main/discordRpc.ts`](src/main/discordRpc.ts).

Because everything else — browsing, playback, playlists, the fullscreen
player, themes, synced lyrics — is just the website itself, all of it works
exactly as it does in a browser, with zero extra code to maintain here.

## Requirements

- Node.js 20+
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- A running Amethyst Music server (see the
  [server repo](https://github.com/qcom-toolbox/Amethyst-Music) for setup)

## Development

```bash
pnpm install
pnpm dev
```

`pnpm dev` starts the Vite dev server for the renderer (the server-picker
screen only), watch-compiles the main process, bundles the preload script,
and launches Electron — all with zero extra dev-tooling dependencies (see
[`scripts/dev.mjs`](scripts/dev.mjs) and [`DEPENDENCIES.md`](DEPENDENCIES.md)
for why).

## Building installers

```bash
pnpm dist          # builds an installer for your current OS
pnpm dist:dir       # unpacked build, faster iteration
```

Installers are written to `release/`. Cross-platform builds (macOS, Windows,
Linux) run automatically in GitHub Actions on every push to `main` and on
version tags (`v*`) — see [`.github/workflows/build.yml`](.github/workflows/build.yml).

- Every push to `main` replaces a single rolling **`latest-build`** pre-release
  with the newest installers — that's always where to grab the most recent
  dev build.
- Pushing a version tag (`v*`) instead publishes a proper, permanent GitHub
  Release under that tag name.

**No code signing is configured.** Unsigned builds will show an "unidentified
developer" warning on macOS (right-click → Open to bypass) and a Windows
SmartScreen prompt. Setting up a real code-signing certificate is a good
follow-up once you have one — see electron-builder's
[code signing docs](https://www.electron.build/code-signing).

## Security

- **The server picker (our own UI)** runs under a strict CSP, `contextIsolation`,
  `sandbox`, and no Node integration, and can only reach main through a
  narrow set of IPC calls — see [`src/preload/index.ts`](src/preload/index.ts).
- **The loaded server page** is third-party content (whatever self-hosted
  server you point the app at) and is treated accordingly: `contextIsolation`,
  `sandbox`, and no Node integration all still apply to it too, but it gets no
  CSP (its own inline `<script>`/`<style>`/`onclick` markup needs that relaxed,
  same as loading it in a normal browser tab would) and, critically, **no
  access to credential storage, the server list, or any privileged IPC** — the
  preload script exposes it only a minimal, one-way reporting channel
  (`window.__amethystReporter`) for the now-playing poller and login capture,
  nothing else. See the `location.protocol === "file:"` branch in
  [`src/preload/index.ts`](src/preload/index.ts).
- If OS-level secure storage isn't available, the app does not fall back to
  storing your password in plain text — it just won't remember it.
- See [`DEPENDENCIES.md`](DEPENDENCIES.md) for the full dependency audit.

## Discord Rich Presence setup

1. Create a free application at
   [discord.com/developers/applications](https://discord.com/developers/applications).
2. Copy its **Application ID**.
3. Open Settings — the ⚙ in the top-right corner of the server picker, or
   **Amethyst Music → Settings…** (⌘,) from the app menu at any time, including
   while connected to a server — and paste the ID into "Discord Application
   Client ID" and enable Rich Presence. The status line underneath tells you
   immediately whether it connected or why not.

## Project layout

```
src/
  main/
    windowManager.ts    Owns the single BrowserWindow: navigates it between
                        the server picker and a chosen server's index.php.
    webIntegration.ts   Auto-login, login capture, and the now-playing poller
                        — all injected scripts that only ever read/click the
                        real page's own DOM, never modify its code.
    servers.ts          Saved server list (JSON in userData).
    credentials.ts      safeStorage-encrypted saved logins.
    discordRpc.ts       Hand-rolled Discord IPC client.
    ipc.ts              IPC handlers for the server-picker shell UI.
  preload/    Two different contextBridge surfaces depending on what's
              loaded — see "Security" above.
  renderer/   The small native "choose a server" + settings UI (React).
  shared/     Types and IPC channel names.
```
