import { useEffect, useMemo, useState } from "react";
import type { Playlist, Track } from "../../shared/types";
import { useAuth } from "../state/AuthContext";
import { useLibrary } from "../state/LibraryContext";
import { usePlayer } from "../state/PlayerContext";
import { PauseIcon, PlayIcon } from "../components/icons";

export default function PlaylistDetail({ playlistId, onBack }: { playlistId: number; onBack: () => void }) {
  const { account } = useAuth();
  const { tracks: allTracks } = useLibrary();
  const player = usePlayer();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const refresh = async () => {
    const all = await window.amethyst.playlists.list();
    const found = all.find((p) => p.id === playlistId) ?? null;
    setPlaylist(found);
    setRenameValue(found?.name ?? "");
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistId]);

  const trackIds = useMemo(
    () => (playlist ? playlist.song_ids.split(",").filter(Boolean).map(Number) : []),
    [playlist]
  );

  const tracks = useMemo<Track[]>(() => {
    const byId = new Map(allTracks.map((t) => [t.id, t]));
    return trackIds.map((id) => byId.get(id)).filter((t): t is Track => Boolean(t));
  }, [trackIds, allTracks]);

  const isOwner = Boolean(account && playlist && (account.isAdmin || account.username === playlist.creator));

  if (loading) return <div className="content-body">Loading…</div>;
  if (!playlist) return <div className="content-body empty-state">Playlist not found.</div>;

  const doRename = async () => {
    if (renameValue.trim() && renameValue.trim() !== playlist.name) {
      await window.amethyst.playlists.rename(playlist.id, renameValue.trim());
      await refresh();
    }
    setRenaming(false);
  };

  const doDelete = async () => {
    if (!confirm(`Delete playlist "${playlist.name}"? This can't be undone.`)) return;
    await window.amethyst.playlists.remove(playlist.id);
    onBack();
  };

  const toggleVisibility = async () => {
    await window.amethyst.playlists.setVisibility(playlist.id, !playlist.is_public);
    await refresh();
  };

  const removeTrack = async (trackId: number) => {
    await window.amethyst.playlists.removeTrack(playlist.id, trackId);
    await refresh();
  };

  const addTrack = async (trackId: number) => {
    await window.amethyst.playlists.addTrack(playlist.id, trackId);
    await refresh();
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= trackIds.length) return;
    const next = [...trackIds];
    [next[index], next[target]] = [next[target], next[index]];
    await window.amethyst.playlists.reorder(playlist.id, next);
    await refresh();
  };

  const availableToAdd = allTracks.filter(
    (t) =>
      !trackIds.includes(t.id) &&
      (t.title.toLowerCase().includes(addQuery.toLowerCase()) ||
        t.artist.toLowerCase().includes(addQuery.toLowerCase()))
  );

  return (
    <>
      <div className="content-header">
        <button className="btn" onClick={onBack}>
          ← Back
        </button>
      </div>
      <div className="content-body">
        <div className="playlist-header">
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: 8,
              background: "var(--search-bg)"
            }}
          />
          <div>
            <div className="badge">{playlist.is_public ? "PUBLIC PLAYLIST" : "PRIVATE PLAYLIST"}</div>
            {renaming ? (
              <div style={{ display: "flex", gap: 8, margin: "6px 0" }}>
                <input
                  className="search-input"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  autoFocus
                />
                <button className="btn" onClick={doRename}>
                  Save
                </button>
              </div>
            ) : (
              <h2 style={{ margin: "6px 0" }}>{playlist.name}</h2>
            )}
            <div className="track-artist">
              By {playlist.creator} · {tracks.length} tracks
            </div>
            {isOwner && (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                {!renaming && (
                  <button className="btn" onClick={() => setRenaming(true)}>
                    Rename
                  </button>
                )}
                <button className="btn" onClick={toggleVisibility}>
                  Make {playlist.is_public ? "private" : "public"}
                </button>
                <button className="btn" onClick={() => setShowAddPanel((v) => !v)}>
                  Add tracks
                </button>
                <button className="btn btn-danger" onClick={doDelete}>
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {isOwner && showAddPanel && (
          <div style={{ marginBottom: 20, border: "1px solid var(--border)", borderRadius: 8, padding: 12 }}>
            <input
              className="search-input"
              style={{ width: "100%", marginBottom: 10 }}
              placeholder="Search your library to add…"
              value={addQuery}
              onChange={(e) => setAddQuery(e.target.value)}
            />
            <div style={{ maxHeight: 200, overflowY: "auto" }}>
              {availableToAdd.slice(0, 30).map((t) => (
                <div
                  key={t.id}
                  className="server-row"
                  style={{ cursor: "pointer" }}
                  onClick={() => void addTrack(t.id)}
                >
                  <div>
                    <div className="server-name">{t.title}</div>
                    <div className="server-url">{t.artist}</div>
                  </div>
                  <span className="link-btn">Add</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tracks.length === 0 && <div className="empty-state">This playlist is empty.</div>}
        {tracks.length > 0 && (
          <table className="track-table">
            <thead>
              <tr>
                <th></th>
                <th>Title</th>
                <th>Album</th>
                {isOwner && <th></th>}
              </tr>
            </thead>
            <tbody>
              {tracks.map((track, index) => {
                const isCurrent = player.currentTrack?.id === track.id;
                return (
                  <tr key={track.id} className={`track-row ${isCurrent ? "playing" : ""}`}>
                    <td
                      style={{ width: 28 }}
                      onClick={() => (isCurrent ? player.togglePlay() : player.playQueue(tracks, index))}
                    >
                      {isCurrent && player.isPlaying ? (
                        <PauseIcon width={14} height={14} />
                      ) : (
                        <PlayIcon width={14} height={14} />
                      )}
                    </td>
                    <td onClick={() => (isCurrent ? player.togglePlay() : player.playQueue(tracks, index))}>
                      <div className="title-cell">
                        <img className="track-cover" src={track.cover_url} alt="" />
                        <div>
                          <div className="track-title">{track.title}</div>
                          <div className="track-artist">{track.artist}</div>
                        </div>
                      </div>
                    </td>
                    <td>{track.album ?? "—"}</td>
                    {isOwner && (
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="link-btn" onClick={() => void move(index, -1)}>
                            ↑
                          </button>
                          <button className="link-btn" onClick={() => void move(index, 1)}>
                            ↓
                          </button>
                          <button className="link-btn" onClick={() => void removeTrack(track.id)}>
                            Remove
                          </button>
                        </div>
                      </td>
                    )}
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
