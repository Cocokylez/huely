"use client";

import { useCallback } from "react";
import type { PipelineResult, ViewMode } from "@/lib/image/types";
import { mix } from "@/lib/image/color";
import { WorkspaceView, type WorkspaceToolsState } from "./WorkspaceView";

interface Props {
  result: PipelineResult;
  view: ViewMode;
  onSample: (hex: string) => void;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  done?: Set<number>;
  /** When set, only this palette color's regions stay vivid; the rest fades. */
  focus?: number | null;
  workspaceTools?: WorkspaceToolsState;
  toolbar?: "default" | "desktop-only" | "hidden";
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
export function ImageCanvas({
  result,
  view,
  onSample,
  canvasRef,
  done,
  focus,
  workspaceTools,
  toolbar,
}: Props) {
  const displayWidth = view === "original" ? result.original.width : result.w;
  const displayHeight = view === "original" ? result.original.height : result.h;

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (view === "original") {
        ctx.putImageData(result.original, 0, 0);
        return;
      }

      const layer = view === "pbn" ? result.pbnBase : result.oil;

      const focusing = focus != null;
      const fading = focusing || (view === "pbn" && done && done.size);

      if (fading) {
        const [pr, pg, pb] = readVar("--paper", [244, 239, 230]);
        const out = new ImageData(result.w, result.h);
        out.data.set(layer.data);
        const d = out.data;
        const idx = result.index;
        for (let p = 0, i = 0; p < idx.length; p++, i += 4) {
          // Focus mode: fade everything except the active color (strong).
          // Otherwise (by-numbers): fade the colors already finished.
          const t = focusing ? (idx[p] !== focus ? 0.85 : 0) : done!.has(idx[p]) ? 0.72 : 0;
          if (t > 0) {
            d[i] = mix(d[i], pr, t);
            d[i + 1] = mix(d[i + 1], pg, t);
            d[i + 2] = mix(d[i + 2], pb, t);
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
    [result, view, done, focus],
  );

  return (
    <WorkspaceView
      width={displayWidth}
      height={displayHeight}
      draw={draw}
      onSample={onSample}
      canvasRef={canvasRef}
      tools={workspaceTools}
      toolbar={toolbar}
    />
  );
}
