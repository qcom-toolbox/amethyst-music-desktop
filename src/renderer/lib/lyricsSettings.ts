const LYRICS_ENABLED_KEY = "amethyst_lyrics_enabled";

export function isLyricsEnabled(): boolean {
  return localStorage.getItem(LYRICS_ENABLED_KEY) !== "0";
}

export function setLyricsEnabled(enabled: boolean): void {
  localStorage.setItem(LYRICS_ENABLED_KEY, enabled ? "1" : "0");
}
