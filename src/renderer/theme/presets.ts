export interface ThemePreset {
  name: string;
  /** null = app default theme, "adaptive" = derive from the current track's cover art, otherwise a hex base color. */
  base: string | "adaptive" | null;
}

export const THEME_PRESETS: ThemePreset[] = [
  { name: "App Default", base: null },
  { name: "Adaptive (from cover art)", base: "adaptive" },
  { name: "White Mode", base: "#FFFFFF" },
  { name: "AMOLED", base: "#000000" },
  { name: "Vibrant Purple", base: "#4A148C" },
  { name: "Electric Blue", base: "#0D47A1" },
  { name: "Deep Teal", base: "#004D40" },
  { name: "Cherry", base: "#880E4F" },
  { name: "Midnight", base: "#0A0E1A" },
  { name: "Forest", base: "#0D140D" },
  { name: "Crimson", base: "#140D0D" },
  { name: "Slate", base: "#1A1A1B" },
  { name: "Jet Black", base: "#0A0A0A" },
  { name: "Material", base: "#121212" }
];
