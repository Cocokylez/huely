import type { MixSlot, PaletteColor } from "@/lib/image/types";
import type { CanvasSpec } from "@/lib/canvas/spec";

export interface HistoryProject {
  id: string;
  name: string;
  colorCount: number;
  palette: PaletteColor[];
  mixer: MixSlot[];
  /** Palette indices the painter has marked finished. */
  done: number[];
  thumbDataUrl: string;
  createdAt: number;
  /** Physical painting surface chosen while framing the source photo. */
  canvas?: CanvasSpec;
}
