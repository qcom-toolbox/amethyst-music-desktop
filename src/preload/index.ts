import { contextBridge, ipcRenderer } from "electron";
import { IPC } from "../shared/ipcChannels";
import type { DiscordRpcStatus, DiscordSettings, NowPlaying, ServerConfig } from "../shared/types";

export interface AmethystShellBridge {
  servers: {
    list: () => Promise<ServerConfig[]>;
    add: (name: string, url: string) => Promise<{ server: ServerConfig; reachable: boolean }>;
    remove: (id: string) => Promise<void>;
    connect: (serverId: string) => Promise<{ ok: boolean }>;
  };
  discord: {
    getSettings: () => Promise<DiscordSettings>;
    setSettings: (settings: DiscordSettings) => Promise<void>;
    getStatus: () => Promise<DiscordRpcStatus>;
  };
  app: {
    getVersion: () => Promise<string>;
  };
}

export interface AmethystPageReporter {
  nowPlaying: (data: NowPlaying | null) => void;
  loginCapture: (username: string, password: string) => void;
}

// This preload script runs on every navigation in the window — both our own
// bundled shell UI (server picker, file://) and whatever self-hosted Amethyst
// server the user connects to (http/https). Each gets a deliberately different,
// minimal bridge: the shell gets full access to server/credential management, the
// remote server page gets nothing but a one-way, write-only reporting channel (no
// server list, no credentials, no arbitrary IPC) — it's third-party content we
// don't control, so it's treated with the same trust level as any other website.
if (location.protocol === "file:") {
  const bridge: AmethystShellBridge = {
    servers: {
      list: () => ipcRenderer.invoke(IPC.listServers),
      add: (name, url) => ipcRenderer.invoke(IPC.addServer, name, url),
      remove: (id) => ipcRenderer.invoke(IPC.removeServer, id),
      connect: (serverId) => ipcRenderer.invoke(IPC.connectToServer, serverId)
    },
    discord: {
      getSettings: () => ipcRenderer.invoke(IPC.getDiscordSettings),
      setSettings: (settings) => ipcRenderer.invoke(IPC.setDiscordSettings, settings),
      getStatus: () => ipcRenderer.invoke(IPC.getDiscordStatus)
    },
    app: {
      getVersion: () => ipcRenderer.invoke(IPC.getAppVersion)
    }
  };
  contextBridge.exposeInMainWorld("amethyst", bridge);
} else {
  const reporter: AmethystPageReporter = {
    nowPlaying: (data) => ipcRenderer.send(IPC.reportNowPlaying, data),
    loginCapture: (username, password) => ipcRenderer.send(IPC.reportLoginCapture, username, password)
  };
  contextBridge.exposeInMainWorld("__amethystReporter", reporter);
}
