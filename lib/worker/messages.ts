import type { PaletteColor, PbnLabel } from "@/lib/image/types";

export type WorkerRequest =
  | { type: "process"; id: number; imageData: ImageData; colorCount: number }
  | { type: "requantize"; id: number; oil: ImageData; colorCount: number };

export type PipelineStage = "painting" | "colors" | "numbering";

export type WorkerResponse =
  | { type: "stage"; id: number; stage: PipelineStage }
  | {
      type: "process";
      id: number;
      oil: ImageData;
      pbnBase: ImageData;
      palette: PaletteColor[];
      labels: PbnLabel[];
    }
  | {
      type: "requantize";
      id: number;
      pbnBase: ImageData;
      palette: PaletteColor[];
      labels: PbnLabel[];
    };
