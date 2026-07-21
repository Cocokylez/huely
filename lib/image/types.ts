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

export interface PipelineResult {
  w: number;
  h: number;
  original: ImageData;
  oil: ImageData;
  pbnBase: ImageData;
  palette: PaletteColor[];
  labels: PbnLabel[];
}
