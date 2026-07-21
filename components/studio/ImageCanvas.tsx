"use client";

import { useEffect, useRef } from "react";
import type { PipelineResult, ViewMode } from "@/lib/image/types";
import { rgbToHex } from "@/lib/image/color";

interface Props {
  result: PipelineResult;
  view: ViewMode;
  onSample: (hex: string) => void;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export function ImageCanvas({ result, view, onSample, canvasRef }: Props) {
  const localRef = useRef<HTMLCanvasElement>(null);
  const ref = canvasRef ?? localRef;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = result.w;
    canvas.height = result.h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const layer =
      view === "original" ? result.original : view === "pbn" ? result.pbnBase : result.oil;
    ctx.putImageData(layer, 0, 0);

    if (view === "pbn") {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const l of result.labels) {
        ctx.font = `700 ${l.size}px -apple-system, "Segoe UI", Roboto, sans-serif`;
        ctx.lineWidth = Math.max(2, l.size / 5);
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.fillStyle = "rgba(45,39,35,0.95)";
        ctx.strokeText(String(l.num), l.x, l.y);
        ctx.fillText(String(l.num), l.x, l.y);
      }
    }
  }, [result, view, ref]);

  const sample = (clientX: number, clientY: number) => {
    const canvas = ref.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((clientX - rect.left) / rect.width) * result.w);
    const y = Math.floor(((clientY - rect.top) / rect.height) * result.h);
    if (x < 0 || y < 0 || x >= result.w || y >= result.h) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const d = ctx.getImageData(x, y, 1, 1).data;
    onSample(rgbToHex(d[0], d[1], d[2]).toUpperCase());
  };

  return (
    <canvas
      ref={ref}
      onPointerDown={(e) => sample(e.clientX, e.clientY)}
      className="mx-auto block h-auto max-w-full cursor-crosshair touch-manipulation rounded-xl"
      aria-label="Your image"
    />
  );
}
