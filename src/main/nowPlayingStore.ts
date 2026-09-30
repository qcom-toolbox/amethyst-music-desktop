// The single source of truth for "what's currently playing", updated by
// webIntegration.reportNowPlaying() (the poller's DOM scrape) and read by
// anything that needs it downstream — Discord Rich Presence (discordRpc.ts)
// and the local song-info API server (apiServer.ts). Keeping it here instead
// of letting each consumer track its own copy means there's exactly one place
// that knows what's playing right now.
import type { NowPlaying } from "../shared/types";

let current: NowPlaying | null = null;

export function setNowPlaying(data: NowPlaying | null): void {
  current = data;
}

export function getNowPlaying(): NowPlaying | null {
  return current;
}
