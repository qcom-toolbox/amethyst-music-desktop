import { useLibrary } from "../state/LibraryContext";

export default function Artists({ onOpenArtist }: { onOpenArtist: (name: string) => void }) {
  const { artists, loading } = useLibrary();

  return (
    <>
      <div className="content-header">
        <h2>Artists</h2>
      </div>
      <div className="content-body">
        {loading && <div className="empty-state">Loading artists…</div>}
        {!loading && artists.length === 0 && <div className="empty-state">No artists yet.</div>}
        <div className="grid">
          {artists.map((artist) => (
            <div className="grid-card" key={artist.name} onClick={() => onOpenArtist(artist.name)}>
              <img src={artist.cover_url} alt="" style={{ borderRadius: "50%" }} />
              <div className="name">{artist.name}</div>
              <div className="meta">{artist.trackCount} tracks</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
