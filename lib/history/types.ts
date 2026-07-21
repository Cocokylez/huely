import type { MixSlot, PaletteColor } from "@/lib/image/types";

export interface HistoryProject {
  id: string;
  name: string;
  colorCount: number;
  palette: PaletteColor[];
  mixer: MixSlot[];
  thumbDataUrl: string;
  createdAt: number;
}
