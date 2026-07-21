/** Downscale an ImageData layer into a small JPEG data URL for history thumbnails (spec: 320px). */
export function imageDataToThumb(imageData: ImageData, max = 320): string {
  const scale = Math.min(1, max / Math.max(imageData.width, imageData.height));
  const w = Math.max(1, Math.round(imageData.width * scale));
  const h = Math.max(1, Math.round(imageData.height * scale));

  const src = document.createElement("canvas");
  src.width = imageData.width;
  src.height = imageData.height;
  src.getContext("2d")!.putImageData(imageData, 0, 0);

  const dst = document.createElement("canvas");
  dst.width = w;
  dst.height = h;
  dst.getContext("2d")!.drawImage(src, 0, 0, w, h);

  return dst.toDataURL("image/jpeg", 0.75);
}
