import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { applyThemeColors } from "../theme/applyTheme";
import { deriveAdaptiveTheme, type AdaptiveTheme } from "../theme/adaptiveExtract";
import { usePlayer } from "./PlayerContext";

const THEME_KEY = "amethyst_theme_base";
const ADAPTIVE = "adaptive";

interface ThemeContextValue {
  /** null = app default, "adaptive" = derived from the current track's cover, otherwise a hex base color. */
  currentBase: string | null;
  setTheme: (base: string | null) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { currentTrack } = usePlayer();
  const [currentBase, setCurrentBase] = useState<string | null>(() => localStorage.getItem(THEME_KEY));
  const adaptiveCache = useRef(new Map<string, AdaptiveTheme>());

  const setTheme = (base: string | null) => {
    setCurrentBase(base);
    if (base) localStorage.setItem(THEME_KEY, base);
    else localStorage.removeItem(THEME_KEY);
  };

  useEffect(() => {
    if (currentBase !== ADAPTIVE) {
      applyThemeColors(currentBase);
      return;
    }
    if (!currentTrack) {
      applyThemeColors(null);
      return;
    }
    const key = currentTrack.cover_url;
    const cached = adaptiveCache.current.get(key);
    if (cached) {
      applyThemeColors(cached.base, cached.gradient2);
      return;
    }
    let cancelled = false;
    void deriveAdaptiveTheme(key).then((theme) => {
      adaptiveCache.current.set(key, theme);
      if (!cancelled) applyThemeColors(theme.base, theme.gradient2);
    });
    return () => {
      cancelled = true;
    };
  }, [currentBase, currentTrack]);

  const value = useMemo(() => ({ currentBase, setTheme }), [currentBase]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
