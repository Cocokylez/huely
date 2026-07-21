import type { MixSlot } from "./types";
import { clamp255, hexToRgb } from "./color";

/**
 * Subtractive (paint-like) color mixing via the RYB model, so blue + yellow
 * makes green instead of gray. RYB→RGB cube after Gossett & Chen.
 */
const RYB_CORNERS = {
  w: [255, 255, 255], // (0,0,0) white
  b: [41, 95, 153], //   (0,0,1) blue
  y: [255, 255, 0], //   (0,1,0) yellow
  g: [0, 168, 51], //    (0,1,1) green
  r: [255, 0, 0], //     (1,0,0) red
  p: [128, 0, 128], //   (1,0,1) purple
  o: [255, 128, 0], //   (1,1,0) orange
  k: [51, 24, 0], //     (1,1,1) near-black
} as const;

export function rybToRgb(r: number, y: number, b: number): [number, number, number] {
  const s = (t: number) => t * t * (3 - 2 * t); // smoothstep for softer blends
  r = s(r);
  y = s(y);
  b = s(b);
  const C = RYB_CORNERS;
  const out: [number, number, number] = [0, 0, 0];
  for (let ch = 0; ch < 3; ch++) {
    const x00 = C.w[ch] + (C.r[ch] - C.w[ch]) * r;
    const x01 = C.b[ch] + (C.p[ch] - C.b[ch]) * r;
    const x10 = C.y[ch] + (C.o[ch] - C.y[ch]) * r;
    const x11 = C.g[ch] + (C.k[ch] - C.g[ch]) * r;
    const y0 = x00 + (x10 - x00) * y;
    const y1 = x01 + (x11 - x01) * y;
    out[ch] = clamp255(y0 + (y1 - y0) * b);
  }
  return out;
}

export function rgbToRyb(r: number, g: number, b: number): [number, number, number] {
  // Blackness (not whiteness) is what maps onto RYB pigment amount: in the
  // subtractive cube (0,0,0)=white paper and (1,1,1)=black, so white pigment
  // must land at RYB(0,0,0). Re-adding whiteness here (a common porting
  // mistake) makes white mix like black.
  const bk = 255 - Math.max(r, g, b);
  const w = Math.min(r, g, b);
  r -= w;
  g -= w;
  b -= w;
  const mg = Math.max(r, g, b);
  let y = Math.min(r, g);
  r -= y;
  g -= y;
  if (b > 0 && g > 0) {
    b /= 2;
    g /= 2;
  }
  y += g;
  b += g;
  const my = Math.max(r, y, b);
  if (my > 0) {
    const n = mg / my;
    r *= n;
    y *= n;
    b *= n;
  }
  return [r + bk, y + bk, b + bk];
}

/** Weighted subtractive mix of paint slots. Returns null if there is nothing to mix. */
export function mixPaints(slots: MixSlot[]): [number, number, number] | null {
  let tr = 0;
  let ty = 0;
  let tb = 0;
  let tw = 0;
  for (const s of slots) {
    const [r, g, b] = hexToRgb(s.hex);
    const [R, Y, B] = rgbToRyb(r, g, b);
    tr += R * s.parts;
    ty += Y * s.parts;
    tb += B * s.parts;
    tw += s.parts;
  }
  if (tw === 0) return null;
  return rybToRgb(tr / tw / 255, ty / tw / 255, tb / tw / 255);
}
