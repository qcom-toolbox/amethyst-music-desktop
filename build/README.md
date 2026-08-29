# Build resources

Two separate icon designs, on purpose:

- **`icon.png`** (1024×1024, flat design) — used for Windows and Linux.
  electron-builder auto-generates the packaged `.ico` from it, and
  `src/main/index.ts` also loads it directly for the window/taskbar icon on
  those platforms.
- **`icon-macos.png`** (1024×1024, padded squircle with a glass/gloss finish)
  — the source artwork for macOS. `build/icon.icns` is generated from it via
  `iconutil` (see below) and is what electron-builder actually packages into
  the `.app` bundle (it prefers this over auto-generating from `icon.png`
  when building for mac). `src/main/index.ts` loads `icon-macos.png` directly
  for the Dock icon while running `pnpm dev` and for the About panel —
  Electron's `nativeImage` can't actually decode `.icns` itself (confirmed
  empirically, it silently returns an empty image), so the source PNG is used
  there instead. A packaged mac app's real Dock icon still comes from the
  bundled `.icns` automatically regardless, independent of any of this
  `nativeImage` code.
- **`icon-macos-pre-tahoe.png`** — an earlier macOS-style design, kept as a
  source file in case it's ever wanted again. Not used by anything directly.

To regenerate `icon.icns` after changing `icon-macos.png` (or from a
different source PNG entirely):

```bash
mkdir icon.iconset
for size in 16 32 128 256 512; do
  sips -z $size $size icon-macos.png --out icon.iconset/icon_${size}x${size}.png
  sips -z $((size*2)) $((size*2)) icon-macos.png --out icon.iconset/icon_${size}x${size}@2x.png
done
iconutil -c icns icon.iconset -o icon.icns
rm -rf icon.iconset
```
