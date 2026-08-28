import { BrowserWindow } from "electron";
import path from "node:path";
import type { ServerConfig } from "../shared/types";
import * as webIntegration from "./webIntegration";

const isDev = process.env.NODE_ENV === "development";

let win: BrowserWindow | null = null;
let activeServer: ServerConfig | null = null;
let settingsWin: BrowserWindow | null = null;

export function setWindow(w: BrowserWindow): void {
  win = w;
  w.webContents.on("did-finish-load", () => {
    if (!activeServer) return;
    const loadedUrl = w.webContents.getURL();
    try {
      if (new URL(loadedUrl).origin !== new URL(activeServer.url).origin) return;
    } catch {
      return;
    }
    void webIntegration.handlePageLoad(w, activeServer);
  });
}

export function getWindow(): BrowserWindow | null {
  return win;
}

export function getActiveServer(): ServerConfig | null {
  return activeServer;
}

export async function showServerPicker(): Promise<void> {
  if (!win) return;
  activeServer = null;
  webIntegration.setCurrentServer(null);
  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    await win.loadURL(process.env.ELECTRON_RENDERER_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    await win.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
  }
}

export async function connectToServer(server: ServerConfig): Promise<void> {
  if (!win) return;
  activeServer = server;
  webIntegration.setCurrentServer(server);
  await win.loadURL(`${server.url}/index.php`);
}

/**
 * Settings needs to be reachable at any time, including while the main window has
 * navigated away to a real server's own page (which has no concept of our
 * settings). Rather than interrupt playback/browsing there, this opens Settings in
 * its own small window instead of reusing the main one.
 */
export async function openSettingsWindow(): Promise<void> {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.focus();
    return;
  }

  settingsWin = new BrowserWindow({
    width: 480,
    height: 640,
    minWidth: 420,
    minHeight: 500,
    backgroundColor: "#0f0c1d",
    autoHideMenuBar: true,
    parent: win ?? undefined,
    webPreferences: {
      preload: path.join(__dirname, "..", "preload", "index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  settingsWin.on("closed", () => {
    settingsWin = null;
  });

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    await settingsWin.loadURL(`${process.env.ELECTRON_RENDERER_URL}?view=settings`);
  } else {
    await settingsWin.loadFile(path.join(__dirname, "..", "renderer", "index.html"), {
      query: { view: "settings" }
    });
  }
}
