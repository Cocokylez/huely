import type { RGB } from "./types";

export const clamp255 = (n: number): number => Math.max(0, Math.min(255, Math.round(n)));

/** Linear blend of two 0–255 channel values. */
export const mix = (a: number, b: number, t: number): number => Math.round(a + (b - a) * t);

export const luminance = (c: RGB): number => 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;

const toHex = (n: number): string => clamp255(n).toString(16).padStart(2, "0");

export const rgbToHex = (r: number, g: number, b: number): string =>
  `#${toHex(r)}${toHex(g)}${toHex(b)}`;

export const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
};

/** Legible ink color to place on top of a given color. */
export const contrastInk = (r: number, g: number, b: number): string =>
  0.299 * r + 0.587 * g + 0.114 * b > 140 ? "#2d2723" : "#fff";
