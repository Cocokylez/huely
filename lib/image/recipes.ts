import { mixPaints } from "./mixer";
import { rgbToHex, hexToRgb } from "./color";

/**
 * Recipe solver — "what do I mix to get this color?"
 * Searches integer-part combinations of a basic artist's paint set through the
 * RYB subtractive mixer and returns the closest achievable mix.
 */

export interface Paint {
  name: string;
  hex: string;
}

/** A realistic starter palette a painter would actually own. */
export const BASE_PAINTS: Paint[] = [
  { name: "Titanium White", hex: "#ffffff" },
  { name: "Ivory Black", hex: "#1f1e1c" },
  { name: "Cadmium Yellow", hex: "#ffce00" },
  { name: "Yellow Ochre", hex: "#cc7722" },
  { name: "Cadmium Red", hex: "#d63a2f" },
  { name: "Alizarin Crimson", hex: "#ad1c42" },
  { name: "Ultramarine Blue", hex: "#2e4093" },
  { name: "Cerulean Blue", hex: "#2e7fb4" },
  { name: "Burnt Sienna", hex: "#8a3324" },
  { name: "Sap Green", hex: "#4e7a27" },
];

export interface RecipePart {
  paint: Paint;
  parts: number;
}

export interface Recipe {
  parts: RecipePart[];
  rgb: [number, number, number];
  hex: string;
  quality: "spot-on" | "close" | "closest";
}

/** Weighted RGB distance — cheap perceptual approximation (same as color naming). */
function dist(a: [number, number, number], b: [number, number, number]): number {
  const rm = (a[0] + b[0]) / 2;
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
}

const gcd2 = (a: number, b: number): number => (b === 0 ? a : gcd2(b, a % b));

/** Parse "#RGB", "RGB", "#RRGGBB", "RRGGBB", or "rgb(r, g, b)". */
export function parseColorInput(raw: string): [number, number, number] | null {
  const s = raw.trim().toLowerCase();
  const rgbMatch = s.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/);
  if (rgbMatch) {
    const [r, g, b] = [+rgbMatch[1], +rgbMatch[2], +rgbMatch[3]];
    if (r > 255 || g > 255 || b > 255) return null;
    return [r, g, b];
  }
  const hex = s.replace(/^#/, "");
  if (/^[0-9a-f]{3}$/.test(hex)) {
    return [
      parseInt(hex[0] + hex[0], 16),
      parseInt(hex[1] + hex[1], 16),
      parseInt(hex[2] + hex[2], 16),
    ];
  }
  if (/^[0-9a-f]{6}$/.test(hex)) {
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }
  return null;
}

const MAX_PARTS = 4; // per-paint parts searched (ratios up to 4:1:1)
const COMPLEXITY_PENALTY = 900; // prefer simpler recipes when scores are similar

/** Find the closest paint recipe for a target color. Runs in a few ms. */
export function solveRecipe(target: [number, number, number]): Recipe {
  const n = BASE_PAINTS.length;
  let best: { parts: RecipePart[]; rgb: [number, number, number]; d: number; score: number } | null =
    null;

  const consider = (idxs: number[], parts: number[]) => {
    // One paint isn't a mix — judge it by its actual color, not the RYB model.
    const rgb: [number, number, number] | null =
      idxs.length === 1
        ? hexToRgb(BASE_PAINTS[idxs[0]].hex)
        : mixPaints(idxs.map((pi, k) => ({ hex: BASE_PAINTS[pi].hex, parts: parts[k] })));
    if (!rgb) return;
    const d = dist(target, rgb);
    const score = d + COMPLEXITY_PENALTY * (idxs.length - 1);
    if (!best || score < best.score) {
      best = {
        parts: idxs.map((pi, k) => ({ paint: BASE_PAINTS[pi], parts: parts[k] })),
        rgb,
        d,
        score,
      };
    }
  };

  // Singles
  for (let a = 0; a < n; a++) consider([a], [1]);

  // Pairs
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      for (let pa = 1; pa <= MAX_PARTS; pa++) {
        for (let pb = 1; pb <= MAX_PARTS; pb++) {
          if (gcd2(pa, pb) > 1) continue; // 2:2 ≡ 1:1
          consider([a, b], [pa, pb]);
        }
      }
    }
  }

  // Triples
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      for (let c = b + 1; c < n; c++) {
        for (let pa = 1; pa <= MAX_PARTS; pa++) {
          for (let pb = 1; pb <= MAX_PARTS; pb++) {
            for (let pc = 1; pc <= MAX_PARTS; pc++) {
              if (gcd2(gcd2(pa, pb), pc) > 1) continue;
              consider([a, b, c], [pa, pb, pc]);
            }
          }
        }
      }
    }
  }

  const b = best!;
  return {
    parts: b.parts,
    rgb: b.rgb,
    hex: rgbToHex(b.rgb[0], b.rgb[1], b.rgb[2]).toUpperCase(),
    quality: b.d < 1000 ? "spot-on" : b.d < 8000 ? "close" : "closest",
  };
}
