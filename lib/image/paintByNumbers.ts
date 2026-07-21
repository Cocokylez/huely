import type { PaletteColor, PbnLabel } from "./types";
import { mix } from "./color";

const MIN_LABEL_AREA = 260; // min region size (px) that earns a number

/**
 * Build the paint-by-numbers layer: a posterized fill with region outlines,
 * plus the list of label positions (drawn as text by the caller so numbers
 * stay crisp at display resolution — the worker stays pure compute).
 */
export function computePbn(
  src: ImageData,
  palette: PaletteColor[],
): { base: ImageData; labels: PbnLabel[] } {
  const { width: w, height: h, data } = src;
  const base = new ImageData(w, h);
  const od = base.data;
  const index = new Uint8Array(w * h); // nearest palette index per pixel

  // Map each pixel to nearest palette color; fill slightly lightened.
  for (let p = 0, i = 0; p < w * h; p++, i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    let best = 0;
    let bestD = Infinity;
    for (let k = 0; k < palette.length; k++) {
      const c = palette[k];
      const dr = r - c.r, dg = g - c.g, db = b - c.b;
      const d = dr * dr + dg * dg + db * db;
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    }
    index[p] = best;
    const c = palette[best];
    od[i] = mix(c.r, 255, 0.12);
    od[i + 1] = mix(c.g, 255, 0.12);
    od[i + 2] = mix(c.b, 255, 0.12);
    od[i + 3] = 255;
  }

  // Outlines: darken pixels whose right/bottom neighbor is a different color.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const right = x < w - 1 && index[p] !== index[p + 1];
      const down = y < h - 1 && index[p] !== index[p + w];
      if (right || down) {
        const i = p * 4;
        od[i] = 70;
        od[i + 1] = 64;
        od[i + 2] = 58;
      }
    }
  }

  // Labels: flood-fill connected components; label those above the area threshold.
  const labels: PbnLabel[] = [];
  const seen = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  for (let start = 0; start < w * h; start++) {
    if (seen[start]) continue;
    const target = index[start];
    let sp = 0;
    stack[sp++] = start;
    seen[start] = 1;
    let area = 0, sumX = 0, sumY = 0;

    while (sp > 0) {
      const p = stack[--sp];
      const px = p % w, py = (p / w) | 0;
      area++;
      sumX += px;
      sumY += py;
      if (px > 0 && !seen[p - 1] && index[p - 1] === target) { seen[p - 1] = 1; stack[sp++] = p - 1; }
      if (px < w - 1 && !seen[p + 1] && index[p + 1] === target) { seen[p + 1] = 1; stack[sp++] = p + 1; }
      if (py > 0 && !seen[p - w] && index[p - w] === target) { seen[p - w] = 1; stack[sp++] = p - w; }
      if (py < h - 1 && !seen[p + w] && index[p + w] === target) { seen[p + w] = 1; stack[sp++] = p + w; }
    }

    if (area >= MIN_LABEL_AREA) {
      labels.push({
        x: Math.round(sumX / area),
        y: Math.round(sumY / area),
        num: target + 1,
        size: Math.max(9, Math.min(18, Math.round(Math.sqrt(area) / 3))),
      });
    }
  }

  return { base, labels };
}
