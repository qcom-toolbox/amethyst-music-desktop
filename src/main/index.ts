import { app, BrowserWindow, Menu, nativeImage, session, shell } from "electron";
import path from "node:path";
import { registerIpcHandlers, initDiscordFromSettings } from "./ipc";
import { openSettingsWindow, setWindow, showServerPicker } from "./windowManager";

// Two distinct icon designs on purpose (see build/README.md): build/icon.png is
// used as-is for Windows/Linux (electron-builder auto-generates the packaged
// .ico from it, and it's also the BrowserWindow taskbar icon there), while
// macOS gets its own dedicated build/icon.icns for packaging — electron-builder
// prefers that over auto-generating from icon.png when building for mac.
// build/icon.icns is generated (via `iconutil`) from build/icon-macos.png, the
// actual source artwork — nativeImage can't decode .icns itself (confirmed
// empirically — it silently returns an empty image), so our own runtime uses of
// the mac design (the Dock icon while running `pnpm dev`, and the About panel)
// load that same source PNG directly instead. A packaged mac app's Dock icon
// still comes from the bundled .icns automatically regardless — that path is
// handled entirely by macOS itself, not by any of this nativeImage code.
// __dirname is always dist/main (this compiled file's own directory) in both
// dev and packaged builds, with build/ two levels up in both — unlike
// app.getAppPath(), which resolves to dist/main itself (the entry script's
// directory) rather than the project/asar root when launched this way.
const buildDir = path.join(__dirname, "..", "..", "build");
const windowIcon = nativeImage.createFromPath(path.join(buildDir, "icon.png"));
const dockIcon =
  process.platform === "darwin"
    ? nativeImage.createFromPath(path.join(buildDir, "icon-macos.png"))
    : windowIcon;

// Only enforced on our own shell UI (the server picker, loaded from a bundled
// file:// page). The real Amethyst web app we navigate to afterwards is a classic
// server-rendered page full of inline <script>/<style>/onclick — there's no way to
// keep a strict CSP without breaking it, so it gets none there. The important
// security boundary is unaffected either way: contextIsolation + nodeIntegration:false
// stay on for every navigation in this window, and the preload script exposes only
// a minimal, one-way reporting bridge to that content — see src/preload/index.ts.
const SHELL_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join("; ");

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1320,
    height: 840,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: "#0f0c1d",
    autoHideMenuBar: true,
    ...(windowIcon.isEmpty() ? {} : { icon: windowIcon }),
    webPreferences: {
      preload: path.join(__dirname, "..", "preload", "index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  mainWindow = win;
  setWindow(win);

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (!details.url.startsWith("file://")) {
      callback({});
      return;
    }
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [SHELL_CSP]
      }
    });
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  win.webContents.on("render-process-gone", (_event, details) => {
    console.error(`[render-process-gone] ${JSON.stringify(details)}`);
  });
  win.webContents.on("console-message", (event) => {
    console.log(`[renderer:${event.level}] ${event.message} (${event.sourceId}:${event.lineNumber})`);
  });

  void showServerPicker();
}

function buildMenu(): void {
  app.setAboutPanelOptions({
    applicationName: "Amethyst Music",
    applicationVersion: app.getVersion(),
    version: app.getVersion(),
    copyright: "Copyright © qcom-toolbox",
    website: "https://github.com/qcom-toolbox/amethyst-music-desktop",
    ...(dockIcon.isEmpty()
      ? {}
      : { iconPath: path.join(buildDir, process.platform === "darwin" ? "icon-macos.png" : "icon.png") })
  });

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "Amethyst Music",
      submenu: [
        { role: "about" },
        { type: "separator" },
        { label: "Switch Server…", click: () => void showServerPicker() },
        { label: "Settings…", accelerator: "CmdOrCtrl+,", click: () => void openSettingsWindow() },
        { role: "reload" },
        { label: "Toggle Developer Tools", accelerator: "CmdOrCtrl+Alt+I", role: "toggleDevTools" },
        { type: "separator" },
        { role: "quit" }
      ]
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  void app.whenReady().then(async () => {
    if (process.platform === "darwin" && !dockIcon.isEmpty()) app.dock?.setIcon(dockIcon);
    registerIpcHandlers();
    await initDiscordFromSettings();
    buildMenu();
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
