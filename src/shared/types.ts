export interface ServerConfig {
  id: string;
  name: string;
  url: string; // normalized, no trailing slash, e.g. https://music.example.com
}

export interface DiscordSettings {
  enabled: boolean;
  clientId: string;
}

export interface DiscordRpcStatus {
  enabled: boolean;
  state: "idle" | "connecting" | "connected";
  /** Human-readable reason the last connection attempt failed, e.g. Discord's own "Invalid Client ID". Cleared on a successful connect. */
  lastError: string | null;
}

export interface NowPlaying {
  title: string;
  artist: string;
  cover: string;
  isPlaying: boolean;
  position: number;
  duration: number;
}
