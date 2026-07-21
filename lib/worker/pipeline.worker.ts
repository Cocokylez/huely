/// <reference lib="webworker" />
import { oilPaint } from "@/lib/image/oilPaint";
import { extractPalette } from "@/lib/image/quantize";
import { computePbn } from "@/lib/image/paintByNumbers";
import { OIL_RADIUS, OIL_LEVELS } from "@/lib/image/constants";
import type { WorkerRequest, WorkerResponse } from "./messages";

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;
  const stage = (s: "painting" | "colors" | "numbering") =>
    ctx.postMessage({ type: "stage", id: msg.id, stage: s } satisfies WorkerResponse);

  if (msg.type === "process") {
    stage("painting");
    const oil = oilPaint(msg.imageData, OIL_RADIUS, OIL_LEVELS);
    stage("colors");
    const palette = extractPalette(oil, msg.colorCount);
    stage("numbering");
    const { base, labels, index } = computePbn(oil, palette);
    const res: WorkerResponse = {
      type: "process",
      id: msg.id,
      oil,
      pbnBase: base,
      palette,
      labels,
      index,
    };
    ctx.postMessage(res);
    return;
  }

  if (msg.type === "requantize") {
    stage("colors");
    const palette = extractPalette(msg.oil, msg.colorCount);
    stage("numbering");
    const { base, labels, index } = computePbn(msg.oil, palette);
    const res: WorkerResponse = {
      type: "requantize",
      id: msg.id,
      pbnBase: base,
      palette,
      labels,
      index,
    };
    ctx.postMessage(res);
  }
};
