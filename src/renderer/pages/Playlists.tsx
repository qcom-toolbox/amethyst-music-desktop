import { useEffect, useState } from "react";
import type { Playlist } from "../../shared/types";
import { PlaylistIcon } from "../components/icons";

export default function Playlists({ onOpenPlaylist }: { onOpenPlaylist: (id: number) => void }) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const list = await window.amethyst.playlists.list();
    setPlaylists(list);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const createPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    await window.amethyst.playlists.create(newName.trim(), true);
    setNewName("");
    setCreating(false);
    await refresh();
  };

  return (
    <>
      <div className="content-header">
        <h2>Playlists</h2>
        <form onSubmit={createPlaylist} style={{ display: "flex", gap: 8 }}>
          <input
            className="search-input"
            placeholder="New playlist name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button className="btn" type="submit" disabled={creating || !newName.trim()}>
            Create
          </button>
        </form>
      </div>
      <div className="content-body">
        {loading && <div className="empty-state">Loading playlists…</div>}
        {!loading && playlists.length === 0 && <div className="empty-state">No playlists yet — create one above.</div>}
        <div className="grid">
          {playlists.map((pl) => (
            <div className="grid-card" key={pl.id} onClick={() => onOpenPlaylist(pl.id)}>
              <div
                style={{
                  aspectRatio: "1",
                  borderRadius: 8,
                  background: "var(--search-bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 8
                }}
              >
                <PlaylistIcon width={40} height={40} />
              </div>
              <div className="name">{pl.name}</div>
              <div className="meta">
                {pl.creator} · {pl.is_public ? "Public" : "Private"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
