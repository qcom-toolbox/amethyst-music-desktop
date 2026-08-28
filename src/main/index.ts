import { app, BrowserWindow, Menu, nativeImage, session, shell } from "electron";
import path from "node:path";
import { registerIpcHandlers, initDiscordFromSettings } from "./ipc";
import { setWindow, showServerPicker } from "./windowManager";

// electron-builder auto-generates the packaged .icns/.ico from this same file
// (see build/README.md) — this is only for the window/taskbar icon on
// Windows/Linux and the Dock icon while running `pnpm dev` (a packaged macOS
// app gets its Dock icon from the .icns bundled by electron-builder instead).
// __dirname is always dist/main (this compiled file's own directory) in both
// dev and packaged builds, with build/icon.png two levels up in both — unlike
// app.getAppPath(), which resolves to dist/main itself (the entry script's
// directory) rather than the project/asar root when launched this way.
const appIcon = nativeImage.createFromPath(path.join(__dirname, "..", "..", "build", "icon.png"));

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
    ...(appIcon.isEmpty() ? {} : { icon: appIcon }),
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
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "Amethyst Music",
      submenu: [
        { label: "Switch Server…", click: () => void showServerPicker() },
        { role: "reload" },
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
    if (process.platform === "darwin" && !appIcon.isEmpty()) app.dock?.setIcon(appIcon);
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
