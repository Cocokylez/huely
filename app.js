/* ============================================================
   Huely — photo → oil-paint reference + exact colors + paint-by-numbers
   All processing runs client-side on the Canvas API. No uploads, no build.
   ============================================================ */

(() => {
  "use strict";

  // ---- Tunables -------------------------------------------------------------
  const WORK_MAX = 760;      // longest edge of the working buffer (px) — perf guard
  const OIL_RADIUS = 4;      // oil-paint brush radius (neighborhood)
  const OIL_LEVELS = 24;     // intensity buckets for the oil-paint filter
  const MIN_LABEL_AREA = 260; // min region size (px) that gets a number in PBN view

  // ---- State ----------------------------------------------------------------
  const state = {
    original: null,   // ImageData (downscaled source)
    oil: null,        // ImageData (oil-paint filtered)
    pbn: null,        // ImageData (paint-by-numbers render)
    palette: [],      // [{r,g,b,hex}]
    view: "oil",
    w: 0,
    h: 0,
  };

  // ---- Element refs ---------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const screens = {
    upload: $("screen-upload"),
    processing: $("screen-processing"),
    result: $("screen-result"),
  };
  const fileInput = $("file-input");
  const dropzone = $("dropzone");
  const display = $("display");
  const dctx = display.getContext("2d", { willReadFrequently: true });
  const paletteEl = $("palette");
  const colorCount = $("color-count");
  const toast = $("toast");

  // ==========================================================================
  //  Flow
  // ==========================================================================
  function showScreen(name) {
    Object.entries(screens).forEach(([k, el]) => (el.hidden = k !== name));
  }

  function handleFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      showToast("That doesn't look like an image.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => onImageReady(img);
      img.onerror = () => showToast("Couldn't read that image.");
      img.src = e.target.result;
    };
    reader.onerror = () => showToast("Couldn't read that file.");
    reader.readAsDataURL(file);
  }

  function onImageReady(img) {
    // Downscale into the working buffer.
    const scale = Math.min(1, WORK_MAX / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    state.w = w;
    state.h = h;

    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const cx = c.getContext("2d", { willReadFrequently: true });
    cx.drawImage(img, 0, 0, w, h);
    state.original = cx.getImageData(0, 0, w, h);

    showScreen("processing");
    // Let the spinner paint before the heavy synchronous work starts.
    requestAnimationFrame(() => setTimeout(runPipeline, 30));
  }

  function runPipeline() {
    // 1. Oil-paint filter (the painterly reference).
    state.oil = oilPaint(state.original, OIL_RADIUS, OIL_LEVELS);
    // 2 + 3. Palette + paint-by-numbers from the oil-painted image.
    rebuildPalette(parseInt(colorCount.value, 10));

    sizeDisplay();
    setView("oil");
    buildPaletteUI();
    showScreen("result");
  }

  // Rebuilds quantization-dependent outputs (palette + PBN) without re-running oil paint.
  function rebuildPalette(n) {
    // Median-cut can emit near-identical boxes when an image has fewer distinct
    // colors than requested. Drop duplicates so the painter gets a clean palette.
    const palette = dedupeColors(medianCut(state.oil, n), 100);
    state.palette = palette.map((c) => ({ ...c, hex: rgbToHex(c.r, c.g, c.b) }));
    state.pbn = buildPaintByNumbers(state.oil, state.palette);
  }

  // Keep the first of any colors within `minDist2` (squared RGB distance) of an earlier one.
  function dedupeColors(colors, minDist2) {
    const out = [];
    for (const c of colors) {
      const dup = out.some((o) => {
        const dr = o.r - c.r, dg = o.g - c.g, db = o.b - c.b;
        return dr * dr + dg * dg + db * db < minDist2;
      });
      if (!dup) out.push(c);
    }
    return out;
  }

  // ==========================================================================
  //  Oil-paint filter (intensity-histogram "oil painting" algorithm)
  // ==========================================================================
  function oilPaint(src, radius, levels) {
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
        count.fill(0); rSum.fill(0); gSum.fill(0); bSum.fill(0);
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

        // Most frequent intensity bucket wins.
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

  // ==========================================================================
  //  Median-cut color quantization
  // ==========================================================================
  function medianCut(img, targetColors) {
    const { data } = img;
    // Sample pixels for speed (cap ~40k samples).
    const total = data.length / 4;
    const step = Math.max(1, Math.floor(total / 40000));
    const pixels = [];
    for (let p = 0; p < total; p += step) {
      const i = p * 4;
      pixels.push([data[i], data[i + 1], data[i + 2]]);
    }

    let boxes = [pixels];
    while (boxes.length < targetColors) {
      // Find the box with the largest single-channel range.
      let bi = -1, bestRange = -1;
      for (let i = 0; i < boxes.length; i++) {
        if (boxes[i].length < 2) continue;
        const r = channelRange(boxes[i]);
        if (r.range > bestRange) { bestRange = r.range; bi = i; }
      }
      if (bi === -1) break;

      const box = boxes[bi];
      const ch = channelRange(box).channel;
      box.sort((a, b) => a[ch] - b[ch]);
      const mid = box.length >> 1;
      boxes.splice(bi, 1, box.slice(0, mid), box.slice(mid));
    }

    return boxes.map((box) => {
      let r = 0, g = 0, b = 0;
      for (const p of box) { r += p[0]; g += p[1]; b += p[2]; }
      const n = box.length || 1;
      return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
    });
  }

  function channelRange(box) {
    let rmin = 255, rmax = 0, gmin = 255, gmax = 0, bmin = 255, bmax = 0;
    for (const p of box) {
      if (p[0] < rmin) rmin = p[0]; if (p[0] > rmax) rmax = p[0];
      if (p[1] < gmin) gmin = p[1]; if (p[1] > gmax) gmax = p[1];
      if (p[2] < bmin) bmin = p[2]; if (p[2] > bmax) bmax = p[2];
    }
    const rr = rmax - rmin, gr = gmax - gmin, br = bmax - bmin;
    const range = Math.max(rr, gr, br);
    const channel = range === rr ? 0 : range === gr ? 1 : 2;
    return { range, channel };
  }

  // ==========================================================================
  //  Paint-by-numbers: posterize + region outlines + numbers
  // ==========================================================================
  function buildPaintByNumbers(src, palette) {
    const { width: w, height: h, data } = src;
    const out = new ImageData(w, h);
    const od = out.data;
    const index = new Uint8Array(w * h); // nearest palette index per pixel

    // Map each pixel to nearest palette color.
    for (let p = 0, i = 0; p < w * h; p++, i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      let best = 0, bestD = Infinity;
      for (let k = 0; k < palette.length; k++) {
        const c = palette[k];
        const dr = r - c.r, dg = g - c.g, db = b - c.b;
        const d = dr * dr + dg * dg + db * db;
        if (d < bestD) { bestD = d; best = k; }
      }
      index[p] = best;
      // Slightly lightened fill so black outlines + numbers stay legible.
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
          od[i] = 70; od[i + 1] = 64; od[i + 2] = 58;
        }
      }
    }

    // Numbers: connected-component pass, label regions above the area threshold.
    labelRegions(index, w, h, out, palette);
    return out;
  }

  // Flood-fill connected components; draw the palette number at each big region's centroid.
  function labelRegions(index, w, h, imgData, palette) {
    const seen = new Uint8Array(w * h);
    const stack = new Int32Array(w * h);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.putImageData(imgData, 0, 0);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

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
        area++; sumX += px; sumY += py;

        if (px > 0 && !seen[p - 1] && index[p - 1] === target) { seen[p - 1] = 1; stack[sp++] = p - 1; }
        if (px < w - 1 && !seen[p + 1] && index[p + 1] === target) { seen[p + 1] = 1; stack[sp++] = p + 1; }
        if (py > 0 && !seen[p - w] && index[p - w] === target) { seen[p - w] = 1; stack[sp++] = p - w; }
        if (py < h - 1 && !seen[p + w] && index[p + w] === target) { seen[p + w] = 1; stack[sp++] = p + w; }
      }

      if (area >= MIN_LABEL_AREA) {
        const cx = Math.round(sumX / area);
        const cy = Math.round(sumY / area);
        const size = Math.max(9, Math.min(18, Math.round(Math.sqrt(area) / 3)));
        ctx.font = `700 ${size}px ` +
          `-apple-system, "Segoe UI", Roboto, sans-serif`;
        const label = String(target + 1);
        ctx.lineWidth = Math.max(2, size / 5);
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.fillStyle = "rgba(45,39,35,0.95)";
        ctx.strokeText(label, cx, cy);
        ctx.fillText(label, cx, cy);
      }
    }
    // Copy labelled result back into the ImageData we return.
    const labelled = ctx.getImageData(0, 0, w, h);
    imgData.data.set(labelled.data);
  }

  // ==========================================================================
  //  Display / views
  // ==========================================================================
  function sizeDisplay() {
    display.width = state.w;
    display.height = state.h;
  }

  function setView(view) {
    state.view = view;
    const img = view === "original" ? state.original : view === "pbn" ? state.pbn : state.oil;
    dctx.putImageData(img, 0, 0);
    document.querySelectorAll(".view-btn").forEach((b) => {
      const active = b.dataset.view === view;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function currentImageData() {
    return state.view === "original" ? state.original : state.view === "pbn" ? state.pbn : state.oil;
  }

  // ==========================================================================
  //  Palette UI
  // ==========================================================================
  function buildPaletteUI() {
    paletteEl.innerHTML = "";
    state.palette.forEach((c, i) => {
      const btn = document.createElement("button");
      btn.className = "swatch";
      btn.title = `Copy ${c.hex}`;
      const numBg = luminance(c) > 140 ? "rgba(45,39,35,0.85)" : "rgba(255,255,255,0.9)";
      const numFg = luminance(c) > 140 ? "#fff" : "#2d2723";
      btn.innerHTML =
        `<span class="swatch-color" style="background:${c.hex}">` +
          `<span class="swatch-num" style="background:${numBg};color:${numFg}">${i + 1}</span>` +
        `</span>` +
        `<span class="swatch-info"><b>${c.hex.toUpperCase()}</b>` +
        `<small>rgb(${c.r}, ${c.g}, ${c.b})</small></span>`;
      btn.addEventListener("click", () => {
        copyText(c.hex.toUpperCase());
        showToast(`Copied ${c.hex.toUpperCase()}`);
      });
      paletteEl.appendChild(btn);
    });
  }

  // ==========================================================================
  //  Eyedropper
  // ==========================================================================
  function sampleFromEvent(e) {
    const rect = display.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    const x = Math.floor((point.clientX - rect.left) / rect.width * state.w);
    const y = Math.floor((point.clientY - rect.top) / rect.height * state.h);
    if (x < 0 || y < 0 || x >= state.w || y >= state.h) return;

    const img = currentImageData();
    const i = (y * state.w + x) * 4;
    const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
    const hex = rgbToHex(r, g, b).toUpperCase();

    $("sample").hidden = false;
    $("sample-swatch").style.background = hex;
    $("sample-hex").textContent = hex;
    $("sample-rgb").textContent = `rgb(${r}, ${g}, ${b})`;
    $("sample-copy").onclick = () => { copyText(hex); showToast(`Copied ${hex}`); };
  }

  // ==========================================================================
  //  Download / print
  // ==========================================================================
  function downloadCurrent() {
    const c = document.createElement("canvas");
    c.width = state.w; c.height = state.h;
    c.getContext("2d").putImageData(currentImageData(), 0, 0);
    c.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `huely-${state.view}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  function printGuide() {
    const area = $("print-area");
    // Paint-by-numbers image.
    const c = document.createElement("canvas");
    c.width = state.w; c.height = state.h;
    c.getContext("2d").putImageData(state.pbn, 0, 0);
    const imgURL = c.toDataURL("image/png");

    const swatches = state.palette.map((col, i) =>
      `<div style="display:flex;align-items:center;gap:8px;margin:4px 0;font:13px sans-serif">
         <span style="width:22px;height:22px;border-radius:5px;background:${col.hex};
           border:1px solid #999;display:inline-grid;place-items:center;color:#fff;
           font-weight:700;font-size:11px;text-shadow:0 0 2px #000">${i + 1}</span>
         <b>${col.hex.toUpperCase()}</b>
         <span style="color:#666">rgb(${col.r}, ${col.g}, ${col.b})</span>
       </div>`).join("");

    area.innerHTML =
      `<h1 style="font:700 22px sans-serif;margin:0 0 4px">Huely — paint-by-numbers guide</h1>
       <p style="font:13px sans-serif;color:#666;margin:0 0 16px">Mix each numbered color and fill the matching areas.</p>
       <img src="${imgURL}" style="max-width:100%;border:1px solid #ccc;border-radius:8px" />
       <h2 style="font:700 16px sans-serif;margin:20px 0 8px">Palette</h2>
       ${swatches}`;
    window.print();
  }

  // ==========================================================================
  //  Helpers
  // ==========================================================================
  const mix = (a, b, t) => Math.round(a + (b - a) * t);
  const luminance = (c) => 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
  const toHex = (n) => n.toString(16).padStart(2, "0");
  const rgbToHex = (r, g, b) => `#${toHex(r)}${toHex(g)}${toHex(b)}`;

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }
  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (_) {}
    document.body.removeChild(ta);
  }

  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add("show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => (toast.hidden = true), 220);
    }, 1600);
  }

  function reset() {
    state.original = state.oil = state.pbn = null;
    state.palette = [];
    fileInput.value = "";
    $("sample").hidden = true;
    showScreen("upload");
  }

  // ==========================================================================
  //  Wiring
  // ==========================================================================
  fileInput.addEventListener("change", (e) => handleFile(e.target.files[0]));

  ["dragenter", "dragover"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add("is-drag"); }));
  ["dragleave", "drop"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove("is-drag"); }));
  dropzone.addEventListener("drop", (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
  });

  document.querySelectorAll(".view-btn").forEach((b) =>
    b.addEventListener("click", () => setView(b.dataset.view)));

  display.addEventListener("click", sampleFromEvent);
  display.addEventListener("touchstart", (e) => { e.preventDefault(); sampleFromEvent(e); }, { passive: false });

  colorCount.addEventListener("change", () => {
    showScreen("processing");
    requestAnimationFrame(() => setTimeout(() => {
      rebuildPalette(parseInt(colorCount.value, 10));
      buildPaletteUI();
      setView(state.view);
      showScreen("result");
    }, 30));
  });

  $("download-btn").addEventListener("click", downloadCurrent);
  $("print-btn").addEventListener("click", printGuide);
  $("reset-btn").addEventListener("click", reset);
})();
