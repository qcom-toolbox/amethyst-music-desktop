// Ported from Amethyst Music's own theme engine (index.php) so switching a base
// color here produces the same panel/primary/accent/border/text derivations the
// original web app computes — same HSL math, same WCAG-contrast-driven primary
// color search so button text stays readable against any base color.

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): Rgb {
  let h = hex.replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const num = parseInt(h, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0"))
      .join("")
  );
}

export function hexToRgba(hex: string, a: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

export function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return [h * 360, s, l];
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  let r: number;
  let g: number;
  let b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [r * 255, g * 255, b * 255];
}

function relLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const lin = (v: number) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(hexA: string, hexB: string): number {
  const l1 = relLuminance(hexA) + 0.05;
  const l2 = relLuminance(hexB) + 0.05;
  return Math.max(l1, l2) / Math.min(l1, l2);
}

export function deriveAccent(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  let [h, s, l] = rgbToHsl(r, g, b);
  const light = l > 0.5;
  // A near-neutral base (AMOLED black, White Mode, a desaturated adaptive cover…)
  // gets a neutral accent too, rather than an arbitrary hue being forced onto it.
  if (s < 0.08) return light ? "#3a3a3a" : "#ffffff";
  if (light) {
    s = clamp(s + 0.5, 0.6, 1.0);
    l = clamp(l - 0.4, 0.3, 0.5);
  } else {
    s = clamp(s + 0.4, 0.5, 0.9);
    l = clamp(l + 0.5, 0.6, 0.85);
  }
  return rgbToHex(...hslToRgb(h, s, l));
}

/**
 * --primary is a button *background* with white text on top, the opposite role of
 * --accent (text/icon color on a dark surface) — so unlike deriveAccent, this
 * searches downward in lightness until white text actually meets WCAG AA (4.5:1)
 * against it, instead of assuming a fixed lightness is dark enough.
 */
export function derivePrimary(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const [h, sRaw] = rgbToHsl(r, g, b);
  const neutral = sRaw < 0.08;
  const s = neutral ? 0 : clamp(Math.max(sRaw, 0.45), 0.45, 0.85);
  let l = 0.42;
  let candidate = rgbToHex(...hslToRgb(h, s, l));
  while (l > 0.1 && contrastRatio("#ffffff", candidate) < 4.5) {
    l -= 0.02;
    candidate = rgbToHex(...hslToRgb(h, s, l));
  }
  return candidate;
}

export function derivePanel(hex: string): string {
  if (hex.toLowerCase() === "#ffffff") return "#f5f5f7";
  const { r, g, b } = hexToRgb(hex);
  let [h, s, l] = rgbToHsl(r, g, b);
  l = l > 0.5 ? clamp(l - 0.05, 0, 1) : clamp(l + 0.05, 0, 1);
  return rgbToHex(...hslToRgb(h, s, l));
}

export function deriveBorder(hex: string): string {
  if (hex.toLowerCase() === "#ffffff") return "#e0e0e0";
  const { r, g, b } = hexToRgb(hex);
  let [h, s, l] = rgbToHsl(r, g, b);
  l = l > 0.5 ? clamp(l - 0.15, 0, 1) : clamp(l + 0.15, 0, 1);
  return rgbToHex(...hslToRgb(h, s, l));
}

export function deriveTextMuted(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  let [h, s, l] = rgbToHsl(r, g, b);
  const light = l > 0.5;
  s = clamp(s * 0.5, 0, 1);
  l = light ? 0.4 : 0.7;
  return rgbToHex(...hslToRgb(h, s, l));
}

export function deriveText(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const [, , l] = rgbToHsl(r, g, b);
  return l > 0.5 ? "#1a1a1b" : "#e0e0e0";
}

/** A surface elevated `steps` notches from the background (inputs, hover states, …). */
export function deriveElevated(hex: string, steps: number): string {
  const { r, g, b } = hexToRgb(hex);
  let [h, s, l] = rgbToHsl(r, g, b);
  const step = 0.025;
  l = l > 0.5 ? clamp(l - steps * step, 0, 1) : clamp(l + steps * step, 0, 1);
  return rgbToHex(...hslToRgb(h, s, l));
}
