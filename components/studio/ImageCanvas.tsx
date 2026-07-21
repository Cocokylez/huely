"use client";

import { useEffect, useRef, useState } from "react";
import type { PipelineResult, ViewMode } from "@/lib/image/types";
import { rgbToHex, mix } from "@/lib/image/color";

interface Props {
  result: PipelineResult;
  view: ViewMode;
  onSample: (hex: string) => void;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  done?: Set<number>;
}

const MIN_SCALE = 1;
const MAX_SCALE = 8;
const TAP_SLOP = 6; // px of movement below which a pointerup counts as a tap

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

export function ImageCanvas({ result, view, onSample, canvasRef, done }: Props) {
  const localRef = useRef<HTMLCanvasElement>(null);
  const ref = canvasRef ?? localRef;
  const containerRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  // Gesture bookkeeping (refs so handlers stay cheap).
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const panStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const downAt = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(0);
  const pinch = useRef<{ dist: number; scale: number } | null>(null);

  // ---- Draw the active layer (with progress fade + check marks on PBN) ----
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = result.w;
    canvas.height = result.h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const layer =
      view === "original" ? result.original : view === "pbn" ? result.pbnBase : result.oil;

    if (view === "pbn" && done && done.size) {
      // Fade the pixels of finished colors toward the paper color so remaining work stands out.
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
  }, [result, view, ref, done]);

  // ---- Zoom / pan helpers ----
  const clampPan = (s: number, x: number, y: number) => {
    const el = containerRef.current;
    if (!el) return { x, y };
    const w = el.clientWidth;
    const h = el.clientHeight;
    const minX = Math.min(0, w - w * s);
    const minY = Math.min(0, h - h * s);
    return { x: Math.min(0, Math.max(minX, x)), y: Math.min(0, Math.max(minY, y)) };
  };

  const zoomAt = (cx: number, cy: number, factor: number) => {
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
    if (next === scale) return;
    const ratio = next / scale;
    let nx = cx - (cx - tx) * ratio;
    let ny = cy - (cy - ty) * ratio;
    if (next === 1) {
      nx = 0;
      ny = 0;
    }
    const c = clampPan(next, nx, ny);
    setScale(next);
    setTx(c.x);
    setTy(c.y);
  };

  const resetZoom = () => {
    setScale(1);
    setTx(0);
    setTy(0);
  };

  const relPoint = (clientX: number, clientY: number) => {
    const el = containerRef.current!;
    const r = el.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const { x, y } = relPoint(e.clientX, e.clientY);
    zoomAt(x, y, e.deltaY < 0 ? 1.15 : 1 / 1.15);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    downAt.current = { x: e.clientX, y: e.clientY };
    moved.current = 0;
    if (pointers.current.size === 1) {
      panStart.current = { x: e.clientX, y: e.clientY, tx, ty };
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = relPoint((a.x + b.x) / 2, (a.y + b.y) / 2);
      const target = pinch.current.scale * (dist / pinch.current.dist);
      zoomAt(mid.x, mid.y, target / scale);
      moved.current += 20;
      return;
    }

    if (panStart.current && scale > 1) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      moved.current = Math.hypot(dx, dy);
      const c = clampPan(scale, panStart.current.tx + dx, panStart.current.ty + dy);
      setTx(c.x);
      setTy(c.y);
    } else if (downAt.current) {
      moved.current = Math.hypot(e.clientX - downAt.current.x, e.clientY - downAt.current.y);
    }
  };

  const sample = (clientX: number, clientY: number) => {
    const canvas = ref.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((clientX - rect.left) / rect.width) * result.w);
    const y = Math.floor(((clientY - rect.top) / rect.height) * result.h);
    if (x < 0 || y < 0 || x >= result.w || y >= result.h) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const dd = ctx.getImageData(x, y, 1, 1).data;
    onSample(rgbToHex(dd[0], dd[1], dd[2]).toUpperCase());
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const wasTap = pointers.current.size === 1 && moved.current < TAP_SLOP;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) panStart.current = null;
    if (wasTap && downAt.current) sample(e.clientX, e.clientY);
  };

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-[14px] bg-[var(--paper-2)] touch-none"
        style={{ aspectRatio: `${result.w} / ${result.h}`, cursor: scale > 1 ? "grab" : "crosshair" }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <canvas
          ref={ref}
          className="absolute inset-0 h-full w-full"
          style={{
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            transformOrigin: "0 0",
            imageRendering: scale > 2.5 ? "pixelated" : "auto",
          }}
          aria-label="Your image"
        />
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--card-2)]/95 p-1 shadow-[var(--shadow-sm)]">
        <button
          onClick={() => {
            const el = containerRef.current!;
            zoomAt(el.clientWidth / 2, el.clientHeight / 2, 1 / 1.4);
          }}
          aria-label="Zoom out"
          className="grid h-7 w-7 place-items-center rounded-full text-[16px] font-bold text-[var(--ink-soft)] hover:bg-[var(--paper-2)] hover:text-[var(--ink)]"
        >
          −
        </button>
        <button
          onClick={resetZoom}
          className="min-w-[42px] rounded-full px-2 text-[11px] font-bold text-[var(--ink-soft)] hover:text-[var(--ink)]"
          title="Reset zoom"
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          onClick={() => {
            const el = containerRef.current!;
            zoomAt(el.clientWidth / 2, el.clientHeight / 2, 1.4);
          }}
          aria-label="Zoom in"
          className="grid h-7 w-7 place-items-center rounded-full text-[16px] font-bold text-[var(--ink-soft)] hover:bg-[var(--paper-2)] hover:text-[var(--ink)]"
        >
          ＋
        </button>
      </div>
    </div>
  );
}
