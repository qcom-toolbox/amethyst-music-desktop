import type { ReactNode } from "react";
import { AlbumIcon, ArtistIcon, LogoutIcon, MusicNoteIcon, PlaylistIcon, SettingsIcon } from "./icons";
import { useAuth } from "../state/AuthContext";
import type { View } from "../App";

export default function Sidebar({ view, setView }: { view: View; setView: (v: View) => void }) {
  const { account, logout } = useAuth();

  const items: { key: View; label: string; icon: ReactNode }[] = [
    { key: "library", label: "Tracks", icon: <MusicNoteIcon /> },
    { key: "albums", label: "Albums", icon: <AlbumIcon /> },
    { key: "artists", label: "Artists", icon: <ArtistIcon /> },
    { key: "playlists", label: "Playlists", icon: <PlaylistIcon /> }
  ];

  return (
    <div className="sidebar">
      <div className="brand">Amethyst Music</div>
      {items.map((item) => (
        <button
          key={item.key}
          className={`nav-item ${view === item.key ? "active" : ""}`}
          onClick={() => setView(item.key)}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
      <div className="nav-spacer" />
      <button className={`nav-item ${view === "settings" ? "active" : ""}`} onClick={() => setView("settings")}>
        <SettingsIcon />
        Settings
      </button>
      <button className="nav-item" onClick={() => void logout()} title={account?.username}>
        <LogoutIcon />
        Sign out
      </button>
    </div>
  );
}
