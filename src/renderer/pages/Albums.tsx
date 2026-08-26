import { useLibrary } from "../state/LibraryContext";

export default function Albums({ onOpenAlbum }: { onOpenAlbum: (albumId: number) => void }) {
  const { albums, loading } = useLibrary();

  return (
    <>
      <div className="content-header">
        <h2>Albums</h2>
      </div>
      <div className="content-body">
        {loading && <div className="empty-state">Loading albums…</div>}
        {!loading && albums.length === 0 && <div className="empty-state">No albums yet.</div>}
        <div className="grid">
          {albums.map((album) => (
            <div className="grid-card" key={album.id} onClick={() => onOpenAlbum(album.id)}>
              <img src={album.cover_url} alt="" />
              <div className="name">{album.name}</div>
              <div className="meta">{album.track_count} tracks</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
