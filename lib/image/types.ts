export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface PaletteColor extends RGB {
  hex: string;
}

export interface MixSlot {
  hex: string;
  parts: number;
}

export interface PbnLabel {
  x: number;
  y: number;
  num: number;
  size: number;
}

export type ViewMode = "oil" | "original" | "pbn";
export type ImageQuality = "auto" | "fast" | "balanced" | "detailed";
export type ResolvedImageQuality = Exclude<ImageQuality, "auto">;

export interface PipelineResult {
  /** Working resolution used by the oil and paint-by-numbers pipeline. */
  w: number;
  h: number;
  /** Higher-resolution reference retained for crisp Original-view zoom. */
  original: ImageData;
  oil: ImageData;
  pbnBase: ImageData;
  palette: PaletteColor[];
  labels: PbnLabel[];
  index: Uint8Array;
  quality: ResolvedImageQuality;
}
