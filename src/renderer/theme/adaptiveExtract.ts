// Extracts an Android-Palette-style set of representative colors from a cover art
// image (quantize pixels into buckets, then score each bucket against six target
// profiles: vibrant/muted × light/normal/dark) and turns that into a theme base +
// gradient accent for the "Adaptive" theme. Ported from Amethyst Music's own
// index.php implementation.
import { hexToRgb, hslToRgb, rgbToHex, rgbToHsl } from "./colorMath";

interface PaletteTarget {
  name: string;
  minS: number;
  targetS: number;
  minL: number;
  targetL: number;
  maxL: number;
}

const PALETTE_TARGETS: PaletteTarget[] = [
  { name: "vibrant", minS: 0.35, targetS: 1.0, minL: 0.3, targetL: 0.5, maxL: 0.7 },
  { name: "lightVibrant", minS: 0.35, targetS: 1.0, minL: 0.55, targetL: 0.74, maxL: 1.0 },
  { name: "darkVibrant", minS: 0.35, targetS: 1.0, minL: 0.0, targetL: 0.26, maxL: 0.45 },
  { name: "muted", minS: 0.0, targetS: 0.3, minL: 0.3, targetL: 0.5, maxL: 0.7 },
  { name: "lightMuted", minS: 0.0, targetS: 0.3, minL: 0.55, targetL: 0.74, maxL: 1.0 },
  { name: "darkMuted", minS: 0.0, targetS: 0.3, minL: 0.0, targetL: 0.26, maxL: 0.45 }
];

type Palette = Partial<Record<string, string>> & { dominant?: string };

function extractPalette(imgSrc: string): Promise<Palette | null> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const size = 64;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        const QUANT = 24;
        const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 200) continue;
          const [, , l] = rgbToHsl(r, g, b);
          if (l < 0.03 || l > 0.97) continue;
          const key = `${Math.round(r / QUANT)}_${Math.round(g / QUANT)}_${Math.round(b / QUANT)}`;
          let bucket = buckets.get(key);
          if (!bucket) {
            bucket = { count: 0, r: 0, g: 0, b: 0 };
            buckets.set(key, bucket);
          }
          bucket.count++;
          bucket.r += r;
          bucket.g += g;
          bucket.b += b;
        }
        if (buckets.size === 0) {
          resolve(null);
          return;
        }

        const allClusters = [...buckets.values()].map((c) => {
          const r = c.r / c.count;
          const g = c.g / c.count;
          const b = c.b / c.count;
          const [, s, l] = rgbToHsl(r, g, b);
          return { hex: rgbToHex(r, g, b), count: c.count, s, l };
        });
        const totalPixels = allClusters.reduce((sum, c) => sum + c.count, 0);
        const MIN_POPULATION_FRACTION = 0.015;
        const dominant = allClusters.reduce((a, b) => (b.count > a.count ? b : a));
        const clusters = allClusters
          .filter((c) => c.count / totalPixels >= MIN_POPULATION_FRACTION)
          .sort((a, b) => b.count - a.count);
        const maxPop = clusters.length ? clusters[0].count : dominant.count;
        const WEIGHT_SAT = 2;
        const WEIGHT_LUMA = 3;
        const WEIGHT_POP = 5;
        const scoreFor = (target: PaletteTarget, c: { s: number; l: number; count: number }) => {
          if (c.l < target.minL || c.l > target.maxL || c.s < target.minS) return -Infinity;
          const satScore = 1 - Math.abs(c.s - target.targetS);
          const lumScore = 1 - Math.abs(c.l - target.targetL);
          const popScore = c.count / maxPop;
          return satScore * WEIGHT_SAT + lumScore * WEIGHT_LUMA + popScore * WEIGHT_POP;
        };

        const used = new Set<string>();
        const palette: Palette = {};
        PALETTE_TARGETS.forEach((target) => {
          let best: (typeof clusters)[number] | null = null;
          let bestScore = -Infinity;
          clusters.forEach((c) => {
            if (used.has(c.hex)) return;
            const sc = scoreFor(target, c);
            if (sc > bestScore) {
              bestScore = sc;
              best = c;
            }
          });
          if (best && bestScore > -Infinity) {
            palette[target.name] = (best as { hex: string }).hex;
            used.add((best as { hex: string }).hex);
          }
        });
        palette.dominant = dominant.hex;
        resolve(palette);
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${imgSrc}`));
    img.src = imgSrc;
  });
}

/** Caps saturation/lightness so a very vibrant spot (neon red, orange...) never becomes a jarring app background. */
function tameAdaptiveColor(hex: string, maxS: number, maxL: number): string {
  const { r, g, b } = hexToRgb(hex);
  let [h, s, l] = rgbToHsl(r, g, b);
  s = Math.min(s, maxS);
  l = Math.min(l, maxL);
  return rgbToHex(...hslToRgb(h, s, l));
}

export interface AdaptiveTheme {
  base: string | null;
  gradient2: string | null;
}

function paletteToTheme(palette: Palette | null): AdaptiveTheme | null {
  if (!palette) return null;
  const rawBase = palette.darkMuted || palette.darkVibrant || palette.muted || palette.vibrant || palette.dominant;
  const rawGradient2 = palette.vibrant || palette.lightVibrant || palette.lightMuted || null;
  if (!rawBase) return null;
  const base = tameAdaptiveColor(rawBase, 0.5, 0.2);
  const gradient2 = rawGradient2 ? tameAdaptiveColor(rawGradient2, 0.65, 0.55) : null;
  return { base, gradient2 };
}

/** Derives an {@link AdaptiveTheme} from a cover art URL, or falls back to the app default on any failure. */
export async function deriveAdaptiveTheme(coverUrl: string): Promise<AdaptiveTheme> {
  try {
    const palette = await extractPalette(coverUrl);
    return paletteToTheme(palette) ?? { base: null, gradient2: null };
  } catch {
    return { base: null, gradient2: null };
  }
}
