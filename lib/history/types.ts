import type { MixSlot, PaletteColor } from "@/lib/image/types";

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
}
