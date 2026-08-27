import type { LyricsResult } from "../shared/types";

// lrclib.net is a free, keyless, public lyrics database — the only network call in
// this app that doesn't go to the user's own configured server. It only ever
// receives the track title and (primary) artist name, never account credentials.
export async function fetchLyrics(artist: string, title: string): Promise<LyricsResult> {
  try {
    const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.status === 404) return { status: "not_found" };
    if (!res.ok) return { status: "error" };
    const json = (await res.json()) as { syncedLyrics?: string; plainLyrics?: string };
    const lrc = json.syncedLyrics || json.plainLyrics || "";
    if (!lrc) return { status: "not_found" };
    return { status: "found", lrc };
  } catch {
    return { status: "error" };
  }
}
