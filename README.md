# Amethyst Music Desktop

An unofficial native desktop client for self-hosted [Amethyst Music](https://github.com/qcom-toolbox/Amethyst-Music)
servers (a PHP/MySQL music server, forked from Purple Music). Built with
Electron + React/TypeScript — not a webview wrapper around the PHP web app.

## Features (this version)

- Connect to any self-hosted Amethyst Music server by URL, and switch between
  multiple saved servers.
- Log in once; credentials are encrypted at rest with the OS keychain
  (Keychain / DPAPI / libsecret via Electron's `safeStorage`) and reused
  automatically on the next launch — no re-typing your password every time.
- Browse your library as Tracks, Albums, and Artists (artists are grouped
  client-side from track metadata, matching the web app).
- Full player: play/pause, seek, volume, shuffle, repeat (off/queue/track),
  and a queue driven by whatever list you clicked into (all tracks, an album,
  an artist, or a playlist).
- Playlists: create, rename, delete, toggle public/private, add/remove
  tracks, reorder.
- Discord Rich Presence showing the current track, artist, and play/pause
  state.

**Not yet implemented** (planned as a follow-up): uploading tracks, editing
track/album metadata and covers, deleting tracks, and the admin panel. The
underlying server API supports all of this — see
[`src/main/amethystApi.ts`](src/main/amethystApi.ts) for the full endpoint
reference gathered from the server's `api.php`.

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

`pnpm dev` starts the Vite dev server for the renderer, watch-compiles the
main/preload TypeScript, and launches Electron pointed at the dev server —
all with zero extra dev-tooling dependencies (see
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
Tag pushes also publish a GitHub Release with the built installers attached.

**No code signing is configured.** Unsigned builds will show an "unidentified
developer" warning on macOS (right-click → Open to bypass) and a Windows
SmartScreen prompt. Setting up a real code-signing certificate is a good
follow-up once you have one — see electron-builder's
[code signing docs](https://www.electron.build/code-signing).

## Security & credential storage

- The Amethyst server API has no session tokens — every authenticated request
  re-sends the username and password. This app stores your password encrypted
  via Electron's `safeStorage` and only ever decrypts it in the main process,
  immediately before making an authenticated request; the renderer (the UI,
  which is what would run any malicious code if the server ever served
  something crafted) never has access to it.
- If OS-level secure storage isn't available on your system, the app will not
  silently fall back to storing your password in plaintext — it just won't
  remember it, and you'll need to log in again next launch.
- The renderer runs with `contextIsolation`, `sandbox`, and no Node
  integration; it can only reach the server through a narrow, explicit set of
  IPC calls defined in [`src/preload/index.ts`](src/preload/index.ts).
- See [`DEPENDENCIES.md`](DEPENDENCIES.md) for the full dependency audit and
  the reasoning behind avoiding `keytar` and `discord-rpc` specifically.

## Discord Rich Presence setup

1. Create a free application at
   [discord.com/developers/applications](https://discord.com/developers/applications).
2. Copy its **Application ID**.
3. In the app, go to Settings → paste the ID into "Discord Application Client
   ID" and enable Rich Presence.

The app talks to your local Discord client directly over its IPC socket —
see [`src/main/discordRpc.ts`](src/main/discordRpc.ts) — no third-party
Discord RPC package is used.

## Project layout

```
src/
  main/       Electron main process: server list, credential storage,
              the Amethyst API client, Discord RPC, IPC wiring.
  preload/    contextBridge surface exposed to the renderer as `window.amethyst`.
  renderer/   React UI (pages, components, state).
  shared/     Types and IPC channel names shared between main/preload/renderer.
```
