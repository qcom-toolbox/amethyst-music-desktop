export interface LyricLine {
  time: number;
  text: string;
}

const LRC_LINE = /\[(\d{2}):(\d{2})(?:[.:](\d{1,3}))?\](.*)/;

export function parseLrc(text: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const line of text.split("\n")) {
    const m = line.match(LRC_LINE);
    if (!m) continue;
    const min = parseInt(m[1], 10);
    const sec = parseInt(m[2], 10);
    const ms = m[3] ? parseInt(m[3].padEnd(3, "0"), 10) : 0;
    const content = m[4].trim();
    if (content) lines.push({ time: min * 60 + sec + ms / 1000, text: content });
  }
  lines.sort((a, b) => a.time - b.time);
  return lines;
}

/** Index of the lyric line active at `position` seconds, or -1 if before the first line. */
export function activeLyricIndex(lines: LyricLine[], position: number): number {
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= position) idx = i;
    else break;
  }
  return idx;
}
