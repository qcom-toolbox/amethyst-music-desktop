import { usePlayer } from "../state/PlayerContext";
import {
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

export default function PlayerBar({ onOpenFullscreen }: { onOpenFullscreen: () => void }) {
  const player = usePlayer();
  const { currentTrack } = player;

  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentTrack) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, input")) return;
    onOpenFullscreen();
  };

  return (
    <div className="player-bar" onClick={handleBarClick} style={{ cursor: currentTrack ? "pointer" : "default" }}>
      <div className="player-track-info">
        {currentTrack ? (
          <>
            <img src={currentTrack.cover_url} alt="" />
            <div className="titles">
              <div className="t">{currentTrack.title}</div>
              <div className="a">{currentTrack.artist}</div>
            </div>
          </>
        ) : (
          <div className="a">Nothing playing</div>
        )}
      </div>

      <div className="player-center">
        <div className="player-controls">
          <button
            className={`icon-btn ${player.shuffle ? "active" : ""}`}
            onClick={player.toggleShuffle}
            title="Shuffle"
          >
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
  );
}
