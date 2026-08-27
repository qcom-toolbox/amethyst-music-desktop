import { app, ipcMain } from "electron";
import { IPC } from "../shared/ipcChannels";
import type { ApiStatusResult, DiscordSettings, LoginResult, PlaybackPresence, ServerConfig } from "../shared/types";
import * as servers from "./servers";
import * as credentials from "./credentials";
import * as appSettings from "./appSettings";
import * as api from "./amethystApi";
import { discordRpc } from "./discordRpc";
import { fetchLyrics } from "./lyrics";

let activeServerId: string | null = null;

async function requireServer(): Promise<ServerConfig> {
  if (!activeServerId) throw new Error("No server selected");
  const all = await servers.listServers();
  const server = all.find((s) => s.id === activeServerId);
  if (!server) throw new Error("Selected server no longer exists");
  return server;
}

async function requireCreds(serverId: string): Promise<api.Credentials> {
  const account = await credentials.getAccountPublic(serverId);
  const password = await credentials.getPassword(serverId);
  if (!account || password === null) throw new Error("Not logged in on this server");
  return { username: account.username, password };
}

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.listServers, () => servers.listServers());

  ipcMain.handle(IPC.addServer, async (_e, name: string, url: string) => {
    const server = await servers.addServer(name, url);
    const reachable = await api.pingServer(server.url);
    return { server, reachable };
  });

  ipcMain.handle(IPC.removeServer, async (_e, id: string) => {
    await servers.removeServer(id);
    await credentials.clearAccount(id);
    if (activeServerId === id) activeServerId = null;
  });

  ipcMain.handle(IPC.login, async (_e, serverId: string, username: string, password: string): Promise<LoginResult> => {
    const all = await servers.listServers();
    const server = all.find((s) => s.id === serverId);
    if (!server) return { status: "error", message: "Unknown server" };

    const result = await api.login(server.url, { username, password });
    if (result.status === "success") {
      activeServerId = serverId;
      await credentials.saveAccount(serverId, username, password, Boolean(result.is_admin));
      await appSettings.updateSettings({ lastServerId: serverId });
    }
    return result;
  });

  ipcMain.handle(IPC.quickLogin, async (_e, serverId: string): Promise<LoginResult> => {
    const all = await servers.listServers();
    const server = all.find((s) => s.id === serverId);
    if (!server) return { status: "error", message: "Unknown server" };

    const account = await credentials.getAccountPublic(serverId);
    const password = await credentials.getPassword(serverId);
    if (!account || password === null) {
      return { status: "error", message: "No saved login for this server" };
    }

    const result = await api.login(server.url, { username: account.username, password });
    if (result.status === "success") {
      activeServerId = serverId;
      await appSettings.updateSettings({ lastServerId: serverId });
    }
    return result;
  });

  ipcMain.handle(IPC.logout, async () => {
    if (activeServerId) {
      await credentials.clearAccount(activeServerId);
    }
    activeServerId = null;
    await appSettings.updateSettings({ lastServerId: null });
    discordRpc.clearActivity();
  });

  ipcMain.handle(IPC.currentAccount, async () => {
    const settings = await appSettings.getSettings();
    if (!settings.lastServerId) return null;

    const all = await servers.listServers();
    const server = all.find((s) => s.id === settings.lastServerId);
    if (!server) return null;

    const account = await credentials.getAccountPublic(server.id);
    if (!account) return null;

    activeServerId = server.id;
    return { server, username: account.username, isAdmin: account.isAdmin };
  });

  ipcMain.handle(IPC.hasSavedCredentials, async (_e, serverId: string) => {
    return credentials.getAccountPublic(serverId);
  });

  ipcMain.handle(IPC.getTracks, async () => {
    const server = await requireServer();
    return api.getTracks(server.url);
  });

  ipcMain.handle(IPC.getAlbums, async () => {
    const server = await requireServer();
    return api.getAlbums(server.url);
  });

  ipcMain.handle(IPC.getAlbumTracks, async (_e, albumId: number) => {
    const server = await requireServer();
    return api.getAlbumTracks(server.url, albumId);
  });

  ipcMain.handle(IPC.incrementPlay, async (_e, trackId: number): Promise<ApiStatusResult> => {
    const server = await requireServer();
    const creds = await requireCreds(server.id);
    return api.incrementPlay(server.url, creds, trackId);
  });

  ipcMain.handle(IPC.streamUrl, async (_e, trackId: number) => {
    const server = await requireServer();
    return api.streamUrl(server.url, trackId);
  });

  ipcMain.handle(IPC.getPlaylists, async () => {
    const server = await requireServer();
    return api.getPlaylists(server.url, null);
  });

  ipcMain.handle(IPC.createPlaylist, async (_e, name: string, isPublic: boolean): Promise<ApiStatusResult> => {
    const server = await requireServer();
    const creds = await requireCreds(server.id);
    return api.createPlaylist(server.url, creds, name, isPublic);
  });

  ipcMain.handle(IPC.renamePlaylist, async (_e, playlistId: number, newName: string): Promise<ApiStatusResult> => {
    const server = await requireServer();
    const creds = await requireCreds(server.id);
    return api.renamePlaylist(server.url, creds, playlistId, newName);
  });

  ipcMain.handle(IPC.deletePlaylist, async (_e, playlistId: number): Promise<ApiStatusResult> => {
    const server = await requireServer();
    const creds = await requireCreds(server.id);
    return api.deletePlaylist(server.url, creds, playlistId);
  });

  ipcMain.handle(
    IPC.setPlaylistVisibility,
    async (_e, playlistId: number, isPublic: boolean): Promise<ApiStatusResult> => {
      const server = await requireServer();
      const creds = await requireCreds(server.id);
      return api.setPlaylistVisibility(server.url, creds, playlistId, isPublic);
    }
  );

  ipcMain.handle(IPC.addTrackToPlaylist, async (_e, playlistId: number, trackId: number): Promise<ApiStatusResult> => {
    const server = await requireServer();
    const creds = await requireCreds(server.id);
    return api.addTrackToPlaylist(server.url, creds, playlistId, trackId);
  });

  ipcMain.handle(
    IPC.removeTrackFromPlaylist,
    async (_e, playlistId: number, trackId: number): Promise<ApiStatusResult> => {
      const server = await requireServer();
      const creds = await requireCreds(server.id);
      return api.removeTrackFromPlaylist(server.url, creds, playlistId, trackId);
    }
  );

  ipcMain.handle(IPC.reorderPlaylist, async (_e, playlistId: number, songIds: number[]): Promise<ApiStatusResult> => {
    const server = await requireServer();
    const creds = await requireCreds(server.id);
    return api.reorderPlaylist(server.url, creds, playlistId, songIds);
  });

  ipcMain.handle(IPC.fetchLyrics, (_e, artist: string, title: string) => fetchLyrics(artist, title));

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

  ipcMain.handle(IPC.updatePresence, (_e, presence: PlaybackPresence) => {
    discordRpc.setActivity(presence);
  });

  ipcMain.handle(IPC.clearPresence, () => {
    discordRpc.clearActivity();
  });

  ipcMain.handle(IPC.getAppVersion, () => app.getVersion());
}

export async function initDiscordFromSettings(): Promise<void> {
  const settings = await appSettings.getSettings();
  if (settings.discordClientId) discordRpc.setClientId(settings.discordClientId);
  if (settings.discordEnabled && settings.discordClientId) discordRpc.enable();
}
