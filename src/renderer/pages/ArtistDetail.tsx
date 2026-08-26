import { useLibrary } from "../state/LibraryContext";
import { usePlayer } from "../state/PlayerContext";
import { PauseIcon, PlayIcon } from "../components/icons";

export default function ArtistDetail({ artistName, onBack }: { artistName: string; onBack: () => void }) {
  const { artists } = useLibrary();
  const player = usePlayer();
  const artist = artists.find((a) => a.name === artistName);

  if (!artist) {
    return (
      <div className="content-body">
        <div className="empty-state">Artist not found.</div>
      </div>
    );
  }

  return (
    <>
      <div className="content-header">
        <button className="btn" onClick={onBack}>
          ← Back
        </button>
      </div>
      <div className="content-body">
        <div className="playlist-header">
          <img src={artist.cover_url} alt="" style={{ borderRadius: "50%" }} />
          <div>
            <div className="badge">ARTIST</div>
            <h2 style={{ margin: "6px 0" }}>{artist.name}</h2>
            <div className="track-artist">{artist.trackCount} tracks</div>
          </div>
        </div>

        <table className="track-table">
          <thead>
            <tr>
              <th></th>
              <th>Title</th>
              <th>Album</th>
              <th>Plays</th>
            </tr>
          </thead>
          <tbody>
            {artist.tracks.map((track, index) => {
              const isCurrent = player.currentTrack?.id === track.id;
              return (
                <tr
                  key={track.id}
                  className={`track-row ${isCurrent ? "playing" : ""}`}
                  onClick={() => (isCurrent ? player.togglePlay() : player.playQueue(artist.tracks, index))}
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
                      <div className="track-title">{track.title}</div>
                    </div>
                  </td>
                  <td>{track.album ?? "—"}</td>
                  <td>{track.play_count}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
