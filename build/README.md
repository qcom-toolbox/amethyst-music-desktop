# Build resources

Two separate icon designs, on purpose:

- **`icon.png`** (1024×1024, flat design) — used for Windows and Linux.
  electron-builder auto-generates the packaged `.ico` from it, and
  `src/main/index.ts` also loads it directly for the window/taskbar icon on
  those platforms.
- **`icon.icns`** + **`icon-macos-tahoe.png`** (macOS "Tahoe"-style design,
  padded squircle with a glass/gloss finish) — used for macOS specifically.
  `icon.icns` is what electron-builder actually packages into the `.app`
  bundle (it prefers this over auto-generating from `icon.png` when building
  for mac); `icon-macos-tahoe.png` is a plain PNG extracted from that same
  `.icns` via `sips` for `src/main/index.ts` to use directly (Electron's
  `nativeImage` can't actually decode `.icns` itself — confirmed empirically,
  it silently returns an empty image — so the Dock icon while running
  `pnpm dev` and the About panel load the PNG instead). A packaged mac app's
  Dock icon still comes from the bundled `.icns` automatically regardless,
  independent of any of this `nativeImage` code.
- **`icon-macos-pre-tahoe.png`** — the previous macOS-style design (padded
  squircle, more pronounced 3D bevel), kept as a source file in case it's
  ever wanted again. Not used by anything directly.

To regenerate `icon.icns` (and `icon-macos-tahoe.png`) from a different
source PNG:

```bash
mkdir icon.iconset
for size in 16 32 128 256 512; do
  sips -z $size $size SOURCE.png --out icon.iconset/icon_${size}x${size}.png
  sips -z $((size*2)) $((size*2)) SOURCE.png --out icon.iconset/icon_${size}x${size}@2x.png
done
iconutil -c icns icon.iconset -o icon.icns
rm -rf icon.iconset
sips -s format png icon.icns --out icon-macos-tahoe.png
```
