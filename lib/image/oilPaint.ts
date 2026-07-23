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

  // Keep one neighborhood histogram and slide it across each row. This is the
  // same effect as rebuilding the whole neighborhood per pixel, but reduces the
  // expensive work from roughly radius² per pixel to radius per pixel.
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(h - 1, y + radius);
    count.fill(0);
    rSum.fill(0);
    gSum.fill(0);
    bSum.fill(0);

    let x0 = 0;
    let x1 = Math.min(w - 1, radius);
    for (let ny = y0; ny <= y1; ny++) {
      let idx = ny * w;
      for (let nx = x0; nx <= x1; nx++, idx++) {
        const bin = intensity[idx];
        const di = idx * 4;
        count[bin]++;
        rSum[bin] += data[di];
        gSum[bin] += data[di + 1];
        bSum[bin] += data[di + 2];
      }
    }

    for (let x = 0; x < w; x++) {
      let best = 0;
      for (let b = 1; b < levels; b++) if (count[b] > count[best]) best = b;
      const n = count[best] || 1;
      const o = (y * w + x) * 4;
      od[o] = (rSum[best] / n) | 0;
      od[o + 1] = (gSum[best] / n) | 0;
      od[o + 2] = (bSum[best] / n) | 0;
      od[o + 3] = 255;

      if (x === w - 1) continue;
      const nextX0 = Math.max(0, x + 1 - radius);
      const nextX1 = Math.min(w - 1, x + 1 + radius);

      if (nextX0 > x0) {
        for (let ny = y0; ny <= y1; ny++) {
          const idx = ny * w + x0;
          const bin = intensity[idx];
          const di = idx * 4;
          count[bin]--;
          rSum[bin] -= data[di];
          gSum[bin] -= data[di + 1];
          bSum[bin] -= data[di + 2];
        }
      }
      if (nextX1 > x1) {
        for (let ny = y0; ny <= y1; ny++) {
          const idx = ny * w + nextX1;
          const bin = intensity[idx];
          const di = idx * 4;
          count[bin]++;
          rSum[bin] += data[di];
          gSum[bin] += data[di + 1];
          bSum[bin] += data[di + 2];
        }
      }
      x0 = nextX0;
      x1 = nextX1;
    }
  }
  return out;
}
