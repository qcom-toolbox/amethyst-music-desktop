export interface ServerConfig {
  id: string;
  name: string;
  url: string; // normalized, no trailing slash, e.g. https://music.example.com
}

export interface DiscordSettings {
  enabled: boolean;
  clientId: string;
}

export interface NowPlaying {
  title: string;
  artist: string;
  cover: string;
  isPlaying: boolean;
  position: number;
  duration: number;
}
