export interface ServerConfig {
  id: string;
  name: string;
  url: string; // normalized, no trailing slash, e.g. https://music.example.com
}

export interface StoredAccount {
  serverId: string;
  username: string;
  isAdmin: boolean;
}

export interface Track {
  id: number;
  title: string;
  artist: string;
  cover: string;
  genre: string;
  album_id: number | null;
  album: string | null;
  play_count: number;
  duration: number;
  uploader_id: number;
  cover_url: string;
  stream_url: string;
}

export interface Album {
  id: number;
  name: string;
  track_count: number;
  cover_url: string;
}

export interface Playlist {
  id: number;
  name: string;
  creator_id: number;
  creator: string;
  song_ids: string;
  is_public: 0 | 1;
}

export interface LoginResult {
  status: "success" | "error";
  message?: string;
  user_id?: number;
  username?: string;
  is_admin?: boolean;
}

export interface ApiStatusResult {
  status: "success" | "error";
  message?: string;
}

export type RepeatMode = "off" | "queue" | "track";

export interface DiscordSettings {
  enabled: boolean;
  clientId: string;
}

export interface LyricsResult {
  status: "found" | "not_found" | "error";
  lrc?: string;
}

export interface PlaybackPresence {
  title: string;
  artist: string;
  album: string | null;
  isPlaying: boolean;
  positionSeconds: number;
  durationSeconds: number;
}
