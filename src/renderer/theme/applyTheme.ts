import {
  deriveAccent,
  deriveBorder,
  deriveElevated,
  derivePanel,
  derivePrimary,
  deriveText,
  deriveTextMuted,
  hexToRgb,
  hexToRgba,
  rgbToHsl
} from "./colorMath";

const THEME_VARS = [
  "--bg",
  "--panel",
  "--primary",
  "--accent",
  "--primary-rgb",
  "--accent-rgb",
  "--text",
  "--text-muted",
  "--border",
  "--border-rgb",
  "--search-bg",
  "--header-bg",
  "--player-bg",
  "--fp-gradient-1",
  "--fp-gradient-2",
  "--input-bg",
  "--elevated-bg",
  "--player-text"
];

/**
 * Applies (or clears) the derived theme variables on the document root. Passing no
 * base color removes every override, falling back to the app's hardcoded default
 * palette defined in theme.css.
 */
export function applyThemeColors(baseHex: string | null, gradient2Hex?: string | null): void {
  const style = document.documentElement.style;
  if (!baseHex) {
    THEME_VARS.forEach((v) => style.removeProperty(v));
    document.documentElement.style.colorScheme = "dark";
    return;
  }

  const panel = derivePanel(baseHex);
  const primary = derivePrimary(baseHex);
  const accent = deriveAccent(baseHex);
  const border = deriveBorder(baseHex);
  const muted = deriveTextMuted(baseHex);
  const text = deriveText(baseHex);
  const inputBg = deriveElevated(baseHex, 1);
  const elevated = deriveElevated(baseHex, 3);
  const { r: pr, g: pg, b: pb } = hexToRgb(primary);
  const { r: ar, g: ag, b: ab } = hexToRgb(accent);
  const { r: br, g: bg, b: bb } = hexToRgb(border);

  style.setProperty("--bg", baseHex);
  style.setProperty("--panel", panel);
  style.setProperty("--primary", primary);
  style.setProperty("--accent", accent);
  style.setProperty("--primary-rgb", `${pr},${pg},${pb}`);
  style.setProperty("--accent-rgb", `${ar},${ag},${ab}`);
  style.setProperty("--text", text);
  style.setProperty("--text-muted", muted);
  style.setProperty("--border", border);
  style.setProperty("--border-rgb", `${br},${bg},${bb}`);
  style.setProperty("--search-bg", panel);
  style.setProperty("--header-bg", hexToRgba(panel, 0.85));
  style.setProperty("--player-bg", hexToRgba(panel, 0.85));
  style.setProperty("--fp-gradient-1", panel);
  style.setProperty("--fp-gradient-2", gradient2Hex || baseHex);
  style.setProperty("--input-bg", inputBg);
  style.setProperty("--elevated-bg", elevated);
  style.setProperty("--player-text", text);

  const [, , l] = rgbToHsl(...(Object.values(hexToRgb(baseHex)) as [number, number, number]));
  document.documentElement.style.colorScheme = l > 0.5 ? "light" : "dark";
}
