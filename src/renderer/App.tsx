import { useState } from "react";
import { AuthProvider, useAuth } from "./state/AuthContext";
import { LibraryProvider } from "./state/LibraryContext";
import { PlayerProvider } from "./state/PlayerContext";
import { ThemeProvider } from "./state/ThemeContext";
import Sidebar from "./components/Sidebar";
import PlayerBar from "./components/PlayerBar";
import FullscreenPlayer from "./components/FullscreenPlayer";
import AuthFlow from "./pages/AuthFlow";
import Library from "./pages/Library";
import Albums from "./pages/Albums";
import AlbumDetail from "./pages/AlbumDetail";
import Artists from "./pages/Artists";
import ArtistDetail from "./pages/ArtistDetail";
import Playlists from "./pages/Playlists";
import PlaylistDetail from "./pages/PlaylistDetail";
import Settings from "./pages/Settings";

export type View = "library" | "albums" | "artists" | "playlists" | "settings";

export type Route =
  | { view: "library" }
  | { view: "albums"; albumId: number | null }
  | { view: "artists"; artistName: string | null }
  | { view: "playlists"; playlistId: number | null }
  | { view: "settings" };

function MainApp() {
  const [route, setRoute] = useState<Route>({ view: "library" });

  const setView = (v: View) => {
    if (v === "albums") setRoute({ view: "albums", albumId: null });
    else if (v === "artists") setRoute({ view: "artists", artistName: null });
    else if (v === "playlists") setRoute({ view: "playlists", playlistId: null });
    else setRoute({ view: v });
  };

  return (
    <div className="main-layout">
      <Sidebar view={route.view} setView={setView} />
      <div className="content">
        {route.view === "library" && <Library />}
        {route.view === "albums" && route.albumId === null && (
          <Albums onOpenAlbum={(id) => setRoute({ view: "albums", albumId: id })} />
        )}
        {route.view === "albums" && route.albumId !== null && (
          <AlbumDetail albumId={route.albumId} onBack={() => setRoute({ view: "albums", albumId: null })} />
        )}
        {route.view === "artists" && route.artistName === null && (
          <Artists onOpenArtist={(name) => setRoute({ view: "artists", artistName: name })} />
        )}
        {route.view === "artists" && route.artistName !== null && (
          <ArtistDetail
            artistName={route.artistName}
            onBack={() => setRoute({ view: "artists", artistName: null })}
          />
        )}
        {route.view === "playlists" && route.playlistId === null && (
          <Playlists onOpenPlaylist={(id) => setRoute({ view: "playlists", playlistId: id })} />
        )}
        {route.view === "playlists" && route.playlistId !== null && (
          <PlaylistDetail
            playlistId={route.playlistId}
            onBack={() => setRoute({ view: "playlists", playlistId: null })}
          />
        )}
        {route.view === "settings" && <Settings />}
      </div>
    </div>
  );
}

function Shell() {
  const { loading, account } = useAuth();
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  if (loading) return <div className="center-screen">Loading…</div>;
  if (!account) return <AuthFlow />;

  return (
    <LibraryProvider>
      <PlayerProvider>
        <ThemeProvider>
          <div className="app-shell">
            <MainApp />
            <PlayerBar onOpenFullscreen={() => setFullscreenOpen(true)} />
            <FullscreenPlayer open={fullscreenOpen} onClose={() => setFullscreenOpen(false)} />
          </div>
        </ThemeProvider>
      </PlayerProvider>
    </LibraryProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
