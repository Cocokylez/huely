"use client";

import { useCallback } from "react";
import type { PipelineResult, ViewMode } from "@/lib/image/types";
import { mix } from "@/lib/image/color";
import { WorkspaceView } from "./WorkspaceView";

interface Props {
  result: PipelineResult;
  view: ViewMode;
  onSample: (hex: string) => void;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  done?: Set<number>;
}

function readVar(name: string, fallback: [number, number, number]): [number, number, number] {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const m = v.match(/^#([0-9a-f]{6})$/i);
  if (!m) return fallback;
  return [
    parseInt(m[1].slice(0, 2), 16),
    parseInt(m[1].slice(2, 4), 16),
    parseInt(m[1].slice(4, 6), 16),
  ];
}

/** Studio canvas — draws the selected layer (with progress fade + numbers on
 *  the by-numbers view) into the reusable painting workspace. */
export function ImageCanvas({ result, view, onSample, canvasRef, done }: Props) {
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const layer =
        view === "original" ? result.original : view === "pbn" ? result.pbnBase : result.oil;

      if (view === "pbn" && done && done.size) {
        const [pr, pg, pb] = readVar("--paper", [244, 239, 230]);
        const out = new ImageData(result.w, result.h);
        out.data.set(layer.data);
        const d = out.data;
        const idx = result.index;
        for (let p = 0, i = 0; p < idx.length; p++, i += 4) {
          if (done.has(idx[p])) {
            d[i] = mix(d[i], pr, 0.72);
            d[i + 1] = mix(d[i + 1], pg, 0.72);
            d[i + 2] = mix(d[i + 2], pb, 0.72);
          }
        }
        ctx.putImageData(out, 0, 0);
      } else {
        ctx.putImageData(layer, 0, 0);
      }

      if (view === "pbn") {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (const l of result.labels) {
          const isDone = done?.has(l.num - 1);
          ctx.font = `700 ${l.size}px -apple-system, "Segoe UI", Roboto, sans-serif`;
          ctx.lineWidth = Math.max(2, l.size / 5);
          ctx.strokeStyle = "rgba(255,255,255,0.9)";
          ctx.fillStyle = isDone ? "rgba(47,111,106,0.95)" : "rgba(45,39,35,0.95)";
          const glyph = isDone ? "✓" : String(l.num);
          ctx.strokeText(glyph, l.x, l.y);
          ctx.fillText(glyph, l.x, l.y);
        }
      }
    },
    [result, view, done],
  );

  return (
    <WorkspaceView
      width={result.w}
      height={result.h}
      draw={draw}
      onSample={onSample}
      canvasRef={canvasRef}
    />
  );
}
