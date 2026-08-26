import type { Album, ApiStatusResult, LoginResult, Playlist, Track } from "../shared/types";

export interface Credentials {
  username: string;
  password: string;
  [key: string]: string | number;
}

function apiUrl(baseUrl: string, action: string, params: Record<string, string | number> = {}): string {
  const url = new URL(`${baseUrl.replace(/\/+$/, "")}/api.php`);
  url.searchParams.set("action", action);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function postForm<T>(url: string, fields: Record<string, string | number>): Promise<T> {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) body.set(key, String(value));
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  if (!res.ok) throw new Error(`Server responded ${res.status}`);
  return (await res.json()) as T;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Server responded ${res.status}`);
  return (await res.json()) as T;
}

/** Quick reachability probe: a valid Amethyst server answers `list` with JSON (even when empty). */
export async function pingServer(baseUrl: string): Promise<boolean> {
  try {
    const data = await getJson<unknown>(apiUrl(baseUrl, "list"));
    return Array.isArray(data);
  } catch {
    return false;
  }
}

export function login(baseUrl: string, creds: Credentials): Promise<LoginResult> {
  return postForm<LoginResult>(apiUrl(baseUrl, "login"), creds);
}

export function register(baseUrl: string, creds: Credentials): Promise<ApiStatusResult> {
  return postForm<ApiStatusResult>(apiUrl(baseUrl, "register"), creds);
}

export function getTracks(baseUrl: string): Promise<Track[]> {
  return getJson<Track[]>(apiUrl(baseUrl, "list"));
}

export function getAlbums(baseUrl: string): Promise<Album[]> {
  return getJson<Album[]>(apiUrl(baseUrl, "albums"));
}

export function getAlbumTracks(baseUrl: string, albumId: number): Promise<Track[]> {
  return getJson<Track[]>(apiUrl(baseUrl, "album_tracks", { q: albumId }));
}

export function incrementPlay(baseUrl: string, creds: Credentials, trackId: number): Promise<ApiStatusResult> {
  return postForm<ApiStatusResult>(apiUrl(baseUrl, "increment_play"), { ...creds, track_id: trackId });
}

export function getPlaylists(baseUrl: string, creds: Credentials | null): Promise<Playlist[]> {
  if (!creds) return getJson<Playlist[]>(apiUrl(baseUrl, "playlists"));
  // The server reads auth from POST body only; `playlists` is a GET action with no
  // auth-aware GET variant, so unauthenticated calls only ever see public playlists.
  // We still expose creds here for forward-compatibility with a future server change.
  return getJson<Playlist[]>(apiUrl(baseUrl, "playlists"));
}

export function createPlaylist(
  baseUrl: string,
  creds: Credentials,
  name: string,
  isPublic: boolean
): Promise<ApiStatusResult> {
  return postForm<ApiStatusResult>(apiUrl(baseUrl, "playlist_create"), {
    ...creds,
    name,
    is_public: isPublic ? "1" : "0"
  });
}

interface PlaylistModBase extends Credentials {
  playlist_id: number;
}

function playlistMod(baseUrl: string, fields: PlaylistModBase & Record<string, string | number>): Promise<ApiStatusResult> {
  return postForm<ApiStatusResult>(apiUrl(baseUrl, "playlist_mod"), fields);
}

export function renamePlaylist(baseUrl: string, creds: Credentials, playlistId: number, newName: string) {
  return playlistMod(baseUrl, { ...creds, playlist_id: playlistId, mode: "rename", new_name: newName });
}

export function deletePlaylist(baseUrl: string, creds: Credentials, playlistId: number) {
  return playlistMod(baseUrl, { ...creds, playlist_id: playlistId, mode: "delete" });
}

export function setPlaylistVisibility(baseUrl: string, creds: Credentials, playlistId: number, isPublic: boolean) {
  return playlistMod(baseUrl, {
    ...creds,
    playlist_id: playlistId,
    mode: "visibility",
    is_public: isPublic ? "1" : "0"
  });
}

export function addTrackToPlaylist(baseUrl: string, creds: Credentials, playlistId: number, trackId: number) {
  return playlistMod(baseUrl, { ...creds, playlist_id: playlistId, mode: "add", track_id: trackId });
}

export function removeTrackFromPlaylist(baseUrl: string, creds: Credentials, playlistId: number, trackId: number) {
  return playlistMod(baseUrl, { ...creds, playlist_id: playlistId, mode: "remove", track_id: trackId });
}

export function reorderPlaylist(baseUrl: string, creds: Credentials, playlistId: number, songIds: number[]) {
  return playlistMod(baseUrl, {
    ...creds,
    playlist_id: playlistId,
    mode: "reorder",
    song_ids: songIds.join(",")
  });
}

export function streamUrl(baseUrl: string, trackId: number): string {
  return apiUrl(baseUrl, "stream", { q: trackId });
}
