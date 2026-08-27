import { app, ipcMain } from "electron";
import { IPC } from "../shared/ipcChannels";
import type { DiscordSettings, NowPlaying } from "../shared/types";
import * as servers from "./servers";
import * as appSettings from "./appSettings";
import { discordRpc } from "./discordRpc";
import * as webIntegration from "./webIntegration";
import { connectToServer as navigateToServer } from "./windowManager";

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.listServers, () => servers.listServers());

  ipcMain.handle(IPC.addServer, async (_e, name: string, url: string) => {
    const server = await servers.addServer(name, url);
    const reachable = await servers.pingServer(server.url);
    return { server, reachable };
  });

  ipcMain.handle(IPC.removeServer, async (_e, id: string) => {
    await servers.removeServer(id);
  });

  ipcMain.handle(IPC.connectToServer, async (_e, serverId: string) => {
    const all = await servers.listServers();
    const server = all.find((s) => s.id === serverId);
    if (!server) return { ok: false };
    await navigateToServer(server);
    return { ok: true };
  });

  ipcMain.handle(IPC.getDiscordSettings, async (): Promise<DiscordSettings> => {
    const settings = await appSettings.getSettings();
    return { enabled: settings.discordEnabled, clientId: settings.discordClientId };
  });

  ipcMain.handle(IPC.setDiscordSettings, async (_e, next: DiscordSettings) => {
    await appSettings.updateSettings({ discordEnabled: next.enabled, discordClientId: next.clientId });
    if (next.clientId) discordRpc.setClientId(next.clientId);
    if (next.enabled && next.clientId) discordRpc.enable();
    else discordRpc.disable();
  });

  ipcMain.handle(IPC.getAppVersion, () => app.getVersion());

  // One-way reports from the *loaded server page's* minimal reporter bridge
  // (window.__amethystReporter, see src/preload/index.ts) — not the renderer app.
  ipcMain.on(IPC.reportNowPlaying, (_e, data: NowPlaying | null) => {
    webIntegration.reportNowPlaying(data);
  });
  ipcMain.on(IPC.reportLoginCapture, (_e, username: string, password: string) => {
    webIntegration.reportLoginCapture(username, password);
  });
}

export async function initDiscordFromSettings(): Promise<void> {
  const settings = await appSettings.getSettings();
  if (settings.discordClientId) discordRpc.setClientId(settings.discordClientId);
  if (settings.discordEnabled && settings.discordClientId) discordRpc.enable();
}
