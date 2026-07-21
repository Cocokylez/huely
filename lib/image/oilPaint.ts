/**
 * Oil-paint effect via the intensity-histogram "oil painting" algorithm:
 * for each pixel, bucket the neighborhood by brightness, then output the
 * average color of the most common brightness bucket.
 */
export function oilPaint(src: ImageData, radius: number, levels: number): ImageData {
  const { width: w, height: h, data } = src;
  const out = new ImageData(w, h);
  const od = out.data;
  const lvl = levels - 1;

  // Precompute per-pixel intensity bucket.
  const intensity = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    intensity[p] = (avg * lvl / 255) | 0;
  }

  const count = new Int32Array(levels);
  const rSum = new Int32Array(levels);
  const gSum = new Int32Array(levels);
  const bSum = new Int32Array(levels);

  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(h - 1, y + radius);
    for (let x = 0; x < w; x++) {
      count.fill(0);
      rSum.fill(0);
      gSum.fill(0);
      bSum.fill(0);
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(w - 1, x + radius);

      for (let ny = y0; ny <= y1; ny++) {
        let idx = ny * w + x0;
        for (let nx = x0; nx <= x1; nx++, idx++) {
          const bin = intensity[idx];
          const di = idx * 4;
          count[bin]++;
          rSum[bin] += data[di];
          gSum[bin] += data[di + 1];
          bSum[bin] += data[di + 2];
        }
      }

      let best = 0;
      for (let b = 1; b < levels; b++) if (count[b] > count[best]) best = b;
      const n = count[best] || 1;
      const o = (y * w + x) * 4;
      od[o] = (rSum[best] / n) | 0;
      od[o + 1] = (gSum[best] / n) | 0;
      od[o + 2] = (bSum[best] / n) | 0;
      od[o + 3] = 255;
    }
  }
  return out;
}
