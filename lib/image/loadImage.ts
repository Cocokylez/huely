import type { ImageQualityProfile } from "./quality";

export interface PreparedImageData {
  reference: ImageData;
  working: ImageData;
}

function renderImageData(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxEdge: number,
): ImageData {
  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Could not get a 2D canvas context.");
  context.drawImage(source, 0, 0, width, height);
  return context.getImageData(0, 0, width, height);
}

/**
 * Decode once, then retain a detailed reference and a smaller processing copy.
 * The working buffer goes to the worker; the reference powers crisp Original zoom.
 */
export async function fileToImageData(
  file: File,
  profile: ImageQualityProfile,
): Promise<PreparedImageData> {
  const bitmap = await createImageBitmap(file);
  try {
    return {
      reference: renderImageData(
        bitmap,
        bitmap.width,
        bitmap.height,
        profile.referenceMax,
      ),
      working: renderImageData(bitmap, bitmap.width, bitmap.height, profile.workMax),
    };
  } finally {
    bitmap.close();
  }
}

/** Decode a cached reference, retaining its detail while rebuilding a working copy. */
export async function dataUrlToImageData(
  url: string,
  profile: ImageQualityProfile,
): Promise<PreparedImageData> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Could not decode cached image."));
    el.src = url;
  });
  return {
    reference: renderImageData(
      img,
      img.naturalWidth,
      img.naturalHeight,
      profile.referenceMax,
    ),
    working: renderImageData(img, img.naturalWidth, img.naturalHeight, profile.workMax),
  };
}
