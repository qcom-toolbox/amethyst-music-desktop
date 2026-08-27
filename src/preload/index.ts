import { contextBridge, ipcRenderer } from "electron";
import { IPC } from "../shared/ipcChannels";
import type {
  Album,
  ApiStatusResult,
  DiscordSettings,
  LoginResult,
  LyricsResult,
  PlaybackPresence,
  Playlist,
  ServerConfig,
  Track
} from "../shared/types";

export interface AmethystBridge {
  servers: {
    list: () => Promise<ServerConfig[]>;
    add: (name: string, url: string) => Promise<{ server: ServerConfig; reachable: boolean }>;
    remove: (id: string) => Promise<void>;
  };
  auth: {
    login: (serverId: string, username: string, password: string) => Promise<LoginResult>;
    quickLogin: (serverId: string) => Promise<LoginResult>;
    logout: () => Promise<void>;
    currentAccount: () => Promise<{ server: ServerConfig; username: string; isAdmin: boolean } | null>;
    hasSavedCredentials: (serverId: string) => Promise<{ username: string; isAdmin: boolean } | null>;
  };
  library: {
    getTracks: () => Promise<Track[]>;
    getAlbums: () => Promise<Album[]>;
    getAlbumTracks: (albumId: number) => Promise<Track[]>;
    incrementPlay: (trackId: number) => Promise<ApiStatusResult>;
    streamUrl: (trackId: number) => Promise<string>;
  };
  playlists: {
    list: () => Promise<Playlist[]>;
    create: (name: string, isPublic: boolean) => Promise<ApiStatusResult>;
    rename: (playlistId: number, newName: string) => Promise<ApiStatusResult>;
    remove: (playlistId: number) => Promise<ApiStatusResult>;
    setVisibility: (playlistId: number, isPublic: boolean) => Promise<ApiStatusResult>;
    addTrack: (playlistId: number, trackId: number) => Promise<ApiStatusResult>;
    removeTrack: (playlistId: number, trackId: number) => Promise<ApiStatusResult>;
    reorder: (playlistId: number, songIds: number[]) => Promise<ApiStatusResult>;
  };
  discord: {
    getSettings: () => Promise<DiscordSettings>;
    setSettings: (settings: DiscordSettings) => Promise<void>;
    updatePresence: (presence: PlaybackPresence) => Promise<void>;
    clearPresence: () => Promise<void>;
  };
  lyrics: {
    fetch: (artist: string, title: string) => Promise<LyricsResult>;
  };
  app: {
    getVersion: () => Promise<string>;
  };
}

const bridge: AmethystBridge = {
  servers: {
    list: () => ipcRenderer.invoke(IPC.listServers),
    add: (name, url) => ipcRenderer.invoke(IPC.addServer, name, url),
    remove: (id) => ipcRenderer.invoke(IPC.removeServer, id)
  },
  auth: {
    login: (serverId, username, password) => ipcRenderer.invoke(IPC.login, serverId, username, password),
    quickLogin: (serverId) => ipcRenderer.invoke(IPC.quickLogin, serverId),
    logout: () => ipcRenderer.invoke(IPC.logout),
    currentAccount: () => ipcRenderer.invoke(IPC.currentAccount),
    hasSavedCredentials: (serverId) => ipcRenderer.invoke(IPC.hasSavedCredentials, serverId)
  },
  library: {
    getTracks: () => ipcRenderer.invoke(IPC.getTracks),
    getAlbums: () => ipcRenderer.invoke(IPC.getAlbums),
    getAlbumTracks: (albumId) => ipcRenderer.invoke(IPC.getAlbumTracks, albumId),
    incrementPlay: (trackId) => ipcRenderer.invoke(IPC.incrementPlay, trackId),
    streamUrl: (trackId) => ipcRenderer.invoke(IPC.streamUrl, trackId)
  },
  playlists: {
    list: () => ipcRenderer.invoke(IPC.getPlaylists),
    create: (name, isPublic) => ipcRenderer.invoke(IPC.createPlaylist, name, isPublic),
    rename: (playlistId, newName) => ipcRenderer.invoke(IPC.renamePlaylist, playlistId, newName),
    remove: (playlistId) => ipcRenderer.invoke(IPC.deletePlaylist, playlistId),
    setVisibility: (playlistId, isPublic) => ipcRenderer.invoke(IPC.setPlaylistVisibility, playlistId, isPublic),
    addTrack: (playlistId, trackId) => ipcRenderer.invoke(IPC.addTrackToPlaylist, playlistId, trackId),
    removeTrack: (playlistId, trackId) => ipcRenderer.invoke(IPC.removeTrackFromPlaylist, playlistId, trackId),
    reorder: (playlistId, songIds) => ipcRenderer.invoke(IPC.reorderPlaylist, playlistId, songIds)
  },
  discord: {
    getSettings: () => ipcRenderer.invoke(IPC.getDiscordSettings),
    setSettings: (settings) => ipcRenderer.invoke(IPC.setDiscordSettings, settings),
    updatePresence: (presence) => ipcRenderer.invoke(IPC.updatePresence, presence),
    clearPresence: () => ipcRenderer.invoke(IPC.clearPresence)
  },
  lyrics: {
    fetch: (artist, title) => ipcRenderer.invoke(IPC.fetchLyrics, artist, title)
  },
  app: {
    getVersion: () => ipcRenderer.invoke(IPC.getAppVersion)
  }
};

contextBridge.exposeInMainWorld("amethyst", bridge);
