import { useMemo, useState } from "react";
import { useLibrary } from "../state/LibraryContext";
import { usePlayer } from "../state/PlayerContext";
import { PauseIcon, PlayIcon } from "../components/icons";

function formatDuration(seconds: number): string {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function Library() {
  const { tracks, loading, error } = useLibrary();
  const player = usePlayer();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tracks;
    return tracks.filter(
      (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || (t.album ?? "").toLowerCase().includes(q)
    );
  }, [tracks, query]);

  return (
    <>
      <div className="content-header">
        <h2>Tracks</h2>
        <div style={{ position: "relative" }}>
          <input
            className="search-input"
            placeholder="Search tracks, artists, albums…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="content-body">
        {loading && <div className="empty-state">Loading your library…</div>}
        {error && <div className="empty-state">{error}</div>}
        {!loading && !error && filtered.length === 0 && <div className="empty-state">No tracks found.</div>}
        {!loading && !error && filtered.length > 0 && (
          <table className="track-table">
            <thead>
              <tr>
                <th></th>
                <th>Title</th>
                <th>Album</th>
                <th>Genre</th>
                <th>Plays</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((track, index) => {
                const isCurrent = player.currentTrack?.id === track.id;
                return (
                  <tr
                    key={track.id}
                    className={`track-row ${isCurrent ? "playing" : ""}`}
                    onClick={() => {
                      if (isCurrent) player.togglePlay();
                      else player.playQueue(filtered, index);
                    }}
                  >
                    <td style={{ width: 28 }}>
                      {isCurrent && player.isPlaying ? <PauseIcon width={14} height={14} /> : <PlayIcon width={14} height={14} />}
                    </td>
                    <td>
                      <div className="title-cell">
                        <img className="track-cover" src={track.cover_url} alt="" />
                        <div>
                          <div className="track-title">{track.title}</div>
                          <div className="track-artist">{track.artist}</div>
                        </div>
                      </div>
                    </td>
                    <td>{track.album ?? "—"}</td>
                    <td>{track.genre}</td>
                    <td>{track.play_count}</td>
                    <td>{formatDuration(track.duration)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
