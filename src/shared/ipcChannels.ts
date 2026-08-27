export const IPC = {
  // Servers (renderer <-> main, our own shell UI only)
  listServers: "servers:list",
  addServer: "servers:add",
  removeServer: "servers:remove",
  connectToServer: "servers:connect",

  // Discord RPC settings
  getDiscordSettings: "discord:getSettings",
  setDiscordSettings: "discord:setSettings",

  // App
  getAppVersion: "app:version",
  switchServer: "app:switchServer",

  // Sent one-way (ipcRenderer.send, not invoke) from the *loaded server page's*
  // minimal reporter bridge — see src/preload/index.ts and src/main/webIntegration.ts.
  reportNowPlaying: "web:nowPlaying",
  reportLoginCapture: "web:loginCapture"
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];
