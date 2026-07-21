import type { PaletteColor, RGB } from "./types";
import { rgbToHex } from "./color";

type Pixel = [number, number, number];

function channelRange(box: Pixel[]): { range: number; channel: number } {
  let rmin = 255, rmax = 0, gmin = 255, gmax = 0, bmin = 255, bmax = 0;
  for (const p of box) {
    if (p[0] < rmin) rmin = p[0];
    if (p[0] > rmax) rmax = p[0];
    if (p[1] < gmin) gmin = p[1];
    if (p[1] > gmax) gmax = p[1];
    if (p[2] < bmin) bmin = p[2];
    if (p[2] > bmax) bmax = p[2];
  }
  const rr = rmax - rmin, gr = gmax - gmin, br = bmax - bmin;
  const range = Math.max(rr, gr, br);
  const channel = range === rr ? 0 : range === gr ? 1 : 2;
  return { range, channel };
}

/** Median-cut color quantization down to `targetColors` representative colors. */
function medianCut(img: ImageData, targetColors: number): RGB[] {
  const { data } = img;
  const total = data.length / 4;
  const step = Math.max(1, Math.floor(total / 40000)); // sample ~40k pixels
  const pixels: Pixel[] = [];
  for (let p = 0; p < total; p += step) {
    const i = p * 4;
    pixels.push([data[i], data[i + 1], data[i + 2]]);
  }

  let boxes: Pixel[][] = [pixels];
  while (boxes.length < targetColors) {
    let bi = -1;
    let bestRange = -1;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].length < 2) continue;
      const r = channelRange(boxes[i]);
      if (r.range > bestRange) {
        bestRange = r.range;
        bi = i;
      }
    }
    if (bi === -1) break;

    const box = boxes[bi];
    const ch = channelRange(box).channel;
    box.sort((a, b) => a[ch] - b[ch]);
    const midIdx = box.length >> 1;
    boxes.splice(bi, 1, box.slice(0, midIdx), box.slice(midIdx));
  }

  return boxes.map((box) => {
    let r = 0, g = 0, b = 0;
    for (const p of box) {
      r += p[0];
      g += p[1];
      b += p[2];
    }
    const n = box.length || 1;
    return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
  });
}

/** Keep the first of any colors within `minDist2` (squared RGB distance) of an earlier one. */
function dedupeColors(colors: RGB[], minDist2: number): RGB[] {
  const out: RGB[] = [];
  for (const c of colors) {
    const dup = out.some((o) => {
      const dr = o.r - c.r, dg = o.g - c.g, db = o.b - c.b;
      return dr * dr + dg * dg + db * db < minDist2;
    });
    if (!dup) out.push(c);
  }
  return out;
}

/** Extract a clean palette (deduped) from an image. */
export function extractPalette(img: ImageData, targetColors: number): PaletteColor[] {
  const colors = dedupeColors(medianCut(img, targetColors), 100);
  return colors.map((c) => ({ ...c, hex: rgbToHex(c.r, c.g, c.b) }));
}
