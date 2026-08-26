import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Album, Track } from "../../shared/types";
import { useAuth } from "./AuthContext";

export interface Artist {
  name: string;
  trackCount: number;
  cover_url: string;
  tracks: Track[];
}

interface LibraryContextValue {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { account } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, a] = await Promise.all([window.amethyst.library.getTracks(), window.amethyst.library.getAlbums()]);
      setTracks(t);
      setAlbums(a);
    } catch {
      setError("Could not load your library from the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (account) void refresh();
    else {
      setTracks([]);
      setAlbums([]);
    }
  }, [account, refresh]);

  const artists = useMemo<Artist[]>(() => {
    const byName = new Map<string, Track[]>();
    for (const t of tracks) {
      const list = byName.get(t.artist) ?? [];
      list.push(t);
      byName.set(t.artist, list);
    }
    return Array.from(byName.entries())
      .map(([name, list]) => ({
        name,
        trackCount: list.length,
        cover_url: list[0]?.cover_url ?? "",
        tracks: list
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tracks]);

  const value = useMemo(
    () => ({ tracks, albums, artists, loading, error, refresh }),
    [tracks, albums, artists, loading, error, refresh]
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within LibraryProvider");
  return ctx;
}
