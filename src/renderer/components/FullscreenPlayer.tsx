import { useEffect, useMemo, useRef, useState } from "react";
import { usePlayer } from "../state/PlayerContext";
import { activeLyricIndex, parseLrc, type LyricLine } from "../lib/lrc";
import { isLyricsEnabled } from "../lib/lyricsSettings";
import {
  ChevronDownIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  RepeatIcon,
  RepeatOneIcon,
  ShuffleIcon,
  VolumeIcon
} from "./icons";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

type SidebarTab = "queue" | "lyrics";

function LyricsPane({ artist, title, position, seek }: { artist: string; title: string; position: number; seek: (s: number) => void }) {
  const [lines, setLines] = useState<LyricLine[] | null>(null);
  const [status, setStatus] = useState<"loading" | "found" | "not_found" | "error" | "disabled" | "plain">("loading");
  const [plainText, setPlainText] = useState("");
  const activeRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    if (!isLyricsEnabled()) {
      setStatus("disabled");
      return;
    }
    let cancelled = false;
    const cacheKey = `amethyst_lyrics_${artist}::${title}`;
    setStatus("loading");
    setLines(null);

    const cached = localStorage.getItem(cacheKey);
    if (cached !== null) {
      applyLrc(cached);
      return;
    }

    void window.amethyst.lyrics.fetch(artist, title).then((result) => {
      if (cancelled) return;
      if (result.status !== "found" || !result.lrc) {
        setStatus(result.status === "found" ? "error" : result.status);
        return;
      }
      try {
        localStorage.setItem(cacheKey, result.lrc);
      } catch {
        // localStorage full/unavailable — lyrics just won't be cached, not fatal
      }
      applyLrc(result.lrc);
    });

    function applyLrc(lrc: string) {
      const parsed = parseLrc(lrc);
      if (parsed.length === 0) {
        setPlainText(lrc);
        setStatus("plain");
      } else {
        setLines(parsed);
        setStatus("found");
      }
    }

    return () => {
      cancelled = true;
    };
  }, [artist, title]);

  const activeIndex = useMemo(() => (lines ? activeLyricIndex(lines, position) : -1), [lines, position]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeIndex]);

  if (status === "disabled") return <p className="lyrics-status">Lyrics are disabled in Settings.</p>;
  if (status === "loading") return <p className="lyrics-status">Loading lyrics…</p>;
  if (status === "not_found") return <p className="lyrics-status">No lyrics found.</p>;
  if (status === "error") return <p className="lyrics-status">Couldn't load lyrics.</p>;
  if (status === "plain") return <p className="lyrics-status" style={{ whiteSpace: "pre-line" }}>{plainText}</p>;

  return (
    <>
      {(lines ?? []).map((line, i) => (
        <p
          key={i}
          ref={i === activeIndex ? activeRef : undefined}
          className={`lyric-line ${i === activeIndex ? "active" : ""}`}
          onClick={() => seek(line.time)}
        >
          {line.text}
        </p>
      ))}
    </>
  );
}

function QueuePane() {
  const player = usePlayer();
  return (
    <div id="fp-queue-list">
      {player.orderedQueue.length === 0 && <p className="lyrics-status">Queue is empty.</p>}
      {player.orderedQueue.map((track, i) => (
        <div
          key={`${track.id}-${i}`}
          className={`queue-item ${i === player.currentOrderIndex ? "active" : ""}`}
          onClick={() => player.jumpTo(i)}
        >
          <img className="track-cover" src={track.cover_url} alt="" />
          <div style={{ minWidth: 0 }}>
            <div className="track-title" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {track.title}
            </div>
            <div className="track-artist">{track.artist}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FullscreenPlayer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const player = usePlayer();
  const { currentTrack } = player;
  const [tab, setTab] = useState<SidebarTab>("queue");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div className={`fsp-overlay ${open ? "open" : ""}`}>
      <div className="fsp-bg">{currentTrack && <img src={currentTrack.cover_url} alt="" />}</div>

      <button className="fsp-close" onClick={onClose} title="Close">
        <ChevronDownIcon />
      </button>

      <div className="fsp-content">
        <div className="fsp-main">
          <div className="fsp-art-container">
            {currentTrack && <img id="fp-cover" src={currentTrack.cover_url} alt="" />}
          </div>
        </div>

        <div className="fsp-sidebar">
          <div className="fp-sidebar-tabs">
            <button className={`fp-tab-btn ${tab === "queue" ? "active" : ""}`} onClick={() => setTab("queue")}>
              Queue
            </button>
            <button className={`fp-tab-btn ${tab === "lyrics" ? "active" : ""}`} onClick={() => setTab("lyrics")}>
              Lyrics
            </button>
          </div>
          <div className="fp-sidebar-content">
            {tab === "queue" && <QueuePane />}
            {tab === "lyrics" &&
              (currentTrack ? (
                <LyricsPane
                  artist={currentTrack.artist}
                  title={currentTrack.title}
                  position={player.position}
                  seek={player.seek}
                />
              ) : (
                <p className="lyrics-status">Nothing playing.</p>
              ))}
          </div>
        </div>
      </div>

      <div className="fsp-bottombar">
        <div className="fsp-bb-track">
          {currentTrack && <img src={currentTrack.cover_url} alt="" />}
          <div style={{ minWidth: 0 }}>
            <div className="fsp-bb-title">{currentTrack?.title ?? "Nothing playing"}</div>
            <div className="fsp-bb-artist">{currentTrack?.artist ?? ""}</div>
          </div>
        </div>

        <div className="fsp-bb-center">
          <div className="player-controls">
            <button className={`icon-btn ${player.shuffle ? "active" : ""}`} onClick={player.toggleShuffle} title="Shuffle">
              <ShuffleIcon />
            </button>
            <button className="icon-btn" onClick={player.prev} title="Previous">
              <PrevIcon />
            </button>
            <button className="play-btn" onClick={player.togglePlay} disabled={!currentTrack}>
              {player.isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button className="icon-btn" onClick={player.next} title="Next">
              <NextIcon />
            </button>
            <button
              className={`icon-btn ${player.repeatMode !== "off" ? "active" : ""}`}
              onClick={player.cycleRepeat}
              title={`Repeat: ${player.repeatMode}`}
            >
              {player.repeatMode === "track" ? <RepeatOneIcon /> : <RepeatIcon />}
            </button>
          </div>
          <div className="seek-row">
            <span>{formatTime(player.position)}</span>
            <input
              type="range"
              min={0}
              max={player.duration || 0}
              value={Math.min(player.position, player.duration || 0)}
              onChange={(e) => player.seek(Number(e.target.value))}
              disabled={!currentTrack}
            />
            <span>{formatTime(player.duration)}</span>
          </div>
        </div>

        <div className="player-volume">
          <VolumeIcon />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={player.volume}
            onChange={(e) => player.setVolume(Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
