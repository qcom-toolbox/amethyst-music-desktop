import { useEffect, useState } from "react";
import type { Track } from "../../shared/types";
import { useLibrary } from "../state/LibraryContext";
import { usePlayer } from "../state/PlayerContext";
import { PauseIcon, PlayIcon } from "../components/icons";

export default function AlbumDetail({ albumId, onBack }: { albumId: number; onBack: () => void }) {
  const { albums } = useLibrary();
  const player = usePlayer();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  const album = albums.find((a) => a.id === albumId);

  useEffect(() => {
    setLoading(true);
    window.amethyst.library
      .getAlbumTracks(albumId)
      .then(setTracks)
      .finally(() => setLoading(false));
  }, [albumId]);

  return (
    <>
      <div className="content-header">
        <button className="btn" onClick={onBack}>
          ← Back
        </button>
      </div>
      <div className="content-body">
        <div className="playlist-header">
          <img src={album?.cover_url} alt="" />
          <div>
            <div className="badge">ALBUM</div>
            <h2 style={{ margin: "6px 0" }}>{album?.name ?? "Album"}</h2>
            <div className="track-artist">{tracks.length} tracks</div>
          </div>
        </div>

        {loading && <div className="empty-state">Loading tracks…</div>}
        {!loading && tracks.length > 0 && (
          <table className="track-table">
            <thead>
              <tr>
                <th></th>
                <th>Title</th>
                <th>Genre</th>
                <th>Plays</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((track, index) => {
                const isCurrent = player.currentTrack?.id === track.id;
                return (
                  <tr
                    key={track.id}
                    className={`track-row ${isCurrent ? "playing" : ""}`}
                    onClick={() => (isCurrent ? player.togglePlay() : player.playQueue(tracks, index))}
                  >
                    <td style={{ width: 28 }}>
                      {isCurrent && player.isPlaying ? (
                        <PauseIcon width={14} height={14} />
                      ) : (
                        <PlayIcon width={14} height={14} />
                      )}
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
                    <td>{track.genre}</td>
                    <td>{track.play_count}</td>
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
