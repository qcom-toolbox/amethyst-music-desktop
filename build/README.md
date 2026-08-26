# Build resources

Drop platform icons here and electron-builder will pick them up automatically:

- `icon.icns` — macOS (1024×1024 source recommended)
- `icon.ico` — Windows
- `icon.png` — Linux (512×512 recommended)

Until these exist, electron-builder falls back to its own default Electron
icon, which is fine for local testing but should be replaced before a public
release.
