# Build resources

`icon.png` (1024×1024) is the app icon. electron-builder auto-generates the
platform-specific formats from it at build time — `.icns` for macOS, `.ico`
for Windows, and the PNG directly for Linux — so there's nothing else to
generate by hand. `src/main/index.ts` also loads this same file directly for
the window/dock icon during `pnpm dev` and on Windows/Linux.

If you ever want more control over the macOS/Windows icons specifically
(e.g. hand-tuned per-size artwork), drop `icon.icns` / `icon.ico` here and
electron-builder will prefer those over auto-generating from `icon.png`.
