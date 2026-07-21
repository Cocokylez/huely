/// <reference lib="webworker" />
import { oilPaint } from "@/lib/image/oilPaint";
import { extractPalette } from "@/lib/image/quantize";
import { computePbn } from "@/lib/image/paintByNumbers";
import { OIL_RADIUS, OIL_LEVELS } from "@/lib/image/constants";
import type { WorkerRequest, WorkerResponse } from "./messages";

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;

  if (msg.type === "process") {
    const oil = oilPaint(msg.imageData, OIL_RADIUS, OIL_LEVELS);
    const palette = extractPalette(oil, msg.colorCount);
    const { base, labels } = computePbn(oil, palette);
    const res: WorkerResponse = {
      type: "process",
      id: msg.id,
      oil,
      pbnBase: base,
      palette,
      labels,
    };
    ctx.postMessage(res);
    return;
  }

  if (msg.type === "requantize") {
    const palette = extractPalette(msg.oil, msg.colorCount);
    const { base, labels } = computePbn(msg.oil, palette);
    const res: WorkerResponse = {
      type: "requantize",
      id: msg.id,
      pbnBase: base,
      palette,
      labels,
    };
    ctx.postMessage(res);
  }
};
