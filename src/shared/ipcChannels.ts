export const IPC = {
  // Servers
  listServers: "servers:list",
  addServer: "servers:add",
  removeServer: "servers:remove",

  // Auth
  login: "auth:login",
  quickLogin: "auth:quickLogin",
  logout: "auth:logout",
  currentAccount: "auth:current",
  hasSavedCredentials: "auth:hasSaved",

  // Library
  getTracks: "library:tracks",
  getAlbums: "library:albums",
  getAlbumTracks: "library:albumTracks",
  incrementPlay: "library:incrementPlay",
  streamUrl: "library:streamUrl",

  // Playlists
  getPlaylists: "playlists:list",
  createPlaylist: "playlists:create",
  renamePlaylist: "playlists:rename",
  deletePlaylist: "playlists:delete",
  setPlaylistVisibility: "playlists:visibility",
  addTrackToPlaylist: "playlists:addTrack",
  removeTrackFromPlaylist: "playlists:removeTrack",
  reorderPlaylist: "playlists:reorder",

  // Lyrics (third-party: lrclib.net, not the user's Amethyst server)
  fetchLyrics: "lyrics:fetch",

  // Discord RPC
  getDiscordSettings: "discord:getSettings",
  setDiscordSettings: "discord:setSettings",
  updatePresence: "discord:updatePresence",
  clearPresence: "discord:clearPresence",

  // App
  getAppVersion: "app:version"
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];
