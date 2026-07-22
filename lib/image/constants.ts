export const WORK_MAX = 1280; // longest edge of the working buffer (px) — higher = crisper zoom
export const OIL_LEVELS = 24; // intensity buckets for the oil-paint filter

/** Oil-paint brush radius scaled to the image so the painterly look stays
 *  consistent across resolutions (≈4 at 760px, ≈7 at 1280px). */
export function oilRadiusFor(w: number, h: number): number {
  return Math.max(3, Math.round(Math.max(w, h) / 210));
}

/** Min region area (px) that earns a paint-by-numbers number, scaled to resolution. */
export function minLabelAreaFor(w: number, h: number): number {
  return Math.max(120, Math.round(w * h * 0.0006));
}

export const DEFAULT_COLOR_COUNT = 8;
export const COLOR_COUNT_OPTIONS = [6, 8, 10, 12, 16];
export const MAX_MIX_SLOTS = 6;
