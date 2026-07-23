import type { PaletteColor } from "@/lib/image/types";

/** Trigger a PNG download of an ImageData layer. */
export function downloadImageData(imageData: ImageData, filename: string) {
  const c = document.createElement("canvas");
  c.width = imageData.width;
  c.height = imageData.height;
  c.getContext("2d")!.putImageData(imageData, 0, 0);
  c.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

/**
 * Build the printable paint-by-numbers guide into #print-area and print.
 * The div lives in the root layout, outside React-managed content.
 */
export function printGuide(imageDataUrl: string, palette: PaletteColor[], projectName: string) {
  const area = document.getElementById("print-area");
  if (!area) return;

  const swatches = palette
    .map(
      (col, i) =>
        `<div style="display:flex;align-items:center;gap:8px;margin:4px 0;font:13px sans-serif">
           <span style="width:22px;height:22px;border-radius:5px;background:${col.hex};
             border:1px solid #999;display:inline-grid;place-items:center;color:#fff;
             font-weight:700;font-size:11px;text-shadow:0 0 2px #000">${i + 1}</span>
           <b style="font-family:monospace">${col.hex.toUpperCase()}</b>
           <span style="color:#666">rgb(${col.r}, ${col.g}, ${col.b})</span>
         </div>`,
    )
    .join("");

  area.innerHTML =
    `<h1 style="font:800 22px sans-serif;margin:0 0 2px">Huely — ${escapeHtml(projectName)}</h1>
     <p style="font:13px sans-serif;color:#666;margin:0 0 16px">Mix each numbered color and fill the matching areas.</p>
     <img src="${imageDataUrl}" style="max-width:100%;border:1px solid #ccc;border-radius:8px" />
     <h2 style="font:700 16px sans-serif;margin:20px 0 8px">Palette</h2>
     ${swatches}`;
  window.print();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Render an ImageData (plus optional label pass) to a PNG data URL. */
export function imageDataToDataUrl(
  imageData: ImageData,
  drawLabels?: (ctx: CanvasRenderingContext2D) => void,
): string {
  const c = document.createElement("canvas");
  c.width = imageData.width;
  c.height = imageData.height;
  const ctx = c.getContext("2d")!;
  ctx.putImageData(imageData, 0, 0);
  drawLabels?.(ctx);
  return c.toDataURL("image/png");
}

/** Compact photo cache format. JPEG keeps detailed references far smaller than PNG. */
export function imageDataToJpegDataUrl(imageData: ImageData, quality = 0.9): string {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  canvas.getContext("2d")!.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/jpeg", quality);
}
