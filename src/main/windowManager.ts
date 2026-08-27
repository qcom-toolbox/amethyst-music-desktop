import { BrowserWindow } from "electron";
import path from "node:path";
import type { ServerConfig } from "../shared/types";
import * as webIntegration from "./webIntegration";

const isDev = process.env.NODE_ENV === "development";

let win: BrowserWindow | null = null;
let activeServer: ServerConfig | null = null;

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
