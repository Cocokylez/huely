"use client";

import { useEffect, useRef, useState } from "react";
import { rgbToHex } from "@/lib/image/color";

interface Props {
  width: number;
  height: number;
  /** Renders the base image into the 2D context (canvas is sized to width×height first). */
  draw: (ctx: CanvasRenderingContext2D) => void;
  onSample: (hex: string) => void;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  tools?: WorkspaceToolsState;
  toolbar?: "default" | "desktop-only" | "hidden";
}

const MIN_SCALE = 1;
const MAX_SCALE = 8;
const TAP_SLOP = 6;
const GRID_STEPS = [0, 3, 4, 6, 8];
const GUIDE_LABELS = ["Guides", "Center", "Diagonals", "Center + diag"];

const toolChip = (active: boolean, panel: boolean) =>
  `${panel ? "w-full justify-center" : "shrink-0"} flex items-center whitespace-nowrap rounded-full border px-3 py-2 text-[12px] font-semibold transition active:scale-95 ${
    active
      ? "border-[var(--accent)] bg-[var(--accent)] text-white"
      : "border-[var(--line)] bg-[var(--card-2)] text-[var(--ink-soft)] hover:text-[var(--ink)]"
  }`;

export function useWorkspaceTools() {
  const [gridN, setGridN] = useState(0);
  const [guides, setGuides] = useState(0);
  const [gray, setGray] = useState(false);
  const [flip, setFlip] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [adj, setAdj] = useState({ b: 100, c: 100, s: 100 });

  return {
    gridN,
    setGridN,
    guides,
    setGuides,
    gray,
    setGray,
    flip,
    setFlip,
    showAdjust,
    setShowAdjust,
    adj,
    setAdj,
  };
}

export type WorkspaceToolsState = ReturnType<typeof useWorkspaceTools>;

export function WorkspaceTools({
  tools,
  layout = "row",
}: {
  tools: WorkspaceToolsState;
  layout?: "row" | "panel";
}) {
  const {
    gridN,
    setGridN,
    guides,
    setGuides,
    gray,
    setGray,
    flip,
    setFlip,
    showAdjust,
    setShowAdjust,
    adj,
    setAdj,
  } = tools;
  const panel = layout === "panel";
  const adjusted = adj.b !== 100 || adj.c !== 100 || adj.s !== 100;

  return (
    <div>
      <div
        className={
          panel
            ? "grid grid-cols-2 gap-2"
            : "mb-2 flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]"
        }
      >
        <button
          type="button"
          onClick={() => setGridN((n) => GRID_STEPS[(GRID_STEPS.indexOf(n) + 1) % GRID_STEPS.length])}
          className={toolChip(gridN > 0, panel)}
          title="Grid method — divide the reference into cells"
        >
          <span aria-hidden>⊞</span> {gridN > 0 ? `Grid ${gridN}` : "Grid"}
        </button>
        <button
          type="button"
          onClick={() => setGuides((g) => (g + 1) % 4)}
          className={toolChip(guides > 0, panel)}
          title="Composition guides"
        >
          <span aria-hidden>⌖</span> {GUIDE_LABELS[guides]}
        </button>
        <button
          type="button"
          onClick={() => setGray((g) => !g)}
          className={toolChip(gray, panel)}
          title="Value / grayscale study"
        >
          <span aria-hidden>◐</span> Value
        </button>
        <button
          type="button"
          onClick={() => setShowAdjust((s) => !s)}
          className={toolChip(showAdjust || adjusted, panel)}
          title="Brightness / contrast / saturation"
        >
          <span aria-hidden>☼</span> Adjust
        </button>
        <button
          type="button"
          onClick={() => setFlip((f) => !f)}
          className={toolChip(flip, panel)}
          title="Flip horizontally to spot errors"
        >
          <span aria-hidden>⇄</span> Flip
        </button>
      </div>

      {showAdjust && (
        <div className={`${panel ? "mt-3" : "mb-2"} grid gap-2 rounded-xl border border-[var(--line)] bg-[var(--card)] p-3`}>
          {(
            [
              ["Brightness", "b"],
              ["Contrast", "c"],
              ["Saturation", "s"],
            ] as const
          ).map(([label, key]) => (
            <label key={key} className="flex items-center gap-3 text-[12px]">
              <span className="w-[70px] flex-none text-[var(--ink-soft)]">{label}</span>
              <input
                type="range"
                min={0}
                max={200}
                value={adj[key]}
                onChange={(event) => setAdj((current) => ({ ...current, [key]: Number(event.target.value) }))}
                className="h-1 flex-1 accent-[var(--accent)]"
              />
              <span className="w-[38px] flex-none text-right font-mono text-[var(--ink-soft)]">
                {adj[key]}%
              </span>
            </label>
          ))}
          <button
            type="button"
            onClick={() => setAdj({ b: 100, c: 100, s: 100 })}
            className="justify-self-start rounded-full border border-[var(--line)] bg-[var(--paper-2)] px-3 py-1 text-[11px] font-semibold text-[var(--ink-soft)] hover:text-[var(--accent)]"
          >
            Reset adjustments
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Reusable painting workspace: zoom/pan + a full artist toolset (grid method,
 * composition guides, value study, brightness/contrast/saturation adjustments,
 * flip, focus/fullscreen) + tap-to-sample eyedropper. Renders whatever `draw`
 * paints; the eyedropper always reads the true (unadjusted) pixel color.
 */
export function WorkspaceView({
  width,
  height,
  draw,
  onSample,
  canvasRef,
  tools: controlledTools,
  toolbar = "default",
}: Props) {
  const localRef = useRef<HTMLCanvasElement>(null);
  const ref = canvasRef ?? localRef;
  const containerRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  const internalTools = useWorkspaceTools();
  const workspaceTools = controlledTools ?? internalTools;
  const { gridN, guides, gray, flip, adj } = workspaceTools;

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const panStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const downAt = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(0);
  const pinch = useRef<{ dist: number; scale: number } | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    draw(ctx);
  }, [draw, width, height, ref]);

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
    const r = containerRef.current!.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  };

  const zoomRef = useRef(zoomAt);
  zoomRef.current = zoomAt;
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomRef.current(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.15 : 1 / 1.15);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

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
      zoomAt(mid.x, mid.y, (pinch.current.scale * (dist / pinch.current.dist)) / scale);
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
    let x = Math.floor(((clientX - rect.left) / rect.width) * width);
    const y = Math.floor(((clientY - rect.top) / rect.height) * height);
    if (flip) x = width - 1 - x;
    if (x < 0 || y < 0 || x >= width || y >= height) return;
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

  // ---- Overlays (image-space lines, crisp at any zoom, visible on any bg) ----
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  if (gridN > 0) {
    const rows = Math.max(1, Math.round((gridN * height) / width));
    for (let i = 1; i < gridN; i++) lines.push({ x1: (i * width) / gridN, y1: 0, x2: (i * width) / gridN, y2: height });
    for (let j = 1; j < rows; j++) lines.push({ x1: 0, y1: (j * height) / rows, x2: width, y2: (j * height) / rows });
  }
  if (guides === 1 || guides === 3) {
    lines.push({ x1: width / 2, y1: 0, x2: width / 2, y2: height });
    lines.push({ x1: 0, y1: height / 2, x2: width, y2: height / 2 });
  }
  if (guides === 2 || guides === 3) {
    lines.push({ x1: 0, y1: 0, x2: width, y2: height });
    lines.push({ x1: width, y1: 0, x2: 0, y2: height });
  }

  const filterStr =
    [
      gray ? "grayscale(1)" : "",
      adj.b !== 100 ? `brightness(${adj.b}%)` : "",
      adj.c !== 100 ? `contrast(${adj.c}%)` : "",
      adj.s !== 100 ? `saturate(${adj.s}%)` : "",
    ]
      .filter(Boolean)
      .join(" ") || "none";

  return (
    <div>
      {toolbar !== "hidden" && (
        <div className={toolbar === "desktop-only" ? "hidden md:block" : undefined}>
          <WorkspaceTools tools={workspaceTools} />
        </div>
      )}

      <div className="relative">
        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-[14px] bg-[var(--paper-2)]"
          style={{
            aspectRatio: `${width} / ${height}`,
            cursor: scale > 1 ? "grab" : "crosshair",
            touchAction: scale > 1 ? "none" : "pan-y",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div
            className="absolute inset-0"
            style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})`, transformOrigin: "0 0" }}
          >
            <div className="absolute inset-0" style={{ transform: flip ? "scaleX(-1)" : "none" }}>
              <canvas
                ref={ref}
                className="absolute inset-0 h-full w-full"
                style={{ imageRendering: "auto", filter: filterStr }}
                aria-label="Your image"
              />
              {lines.length > 0 && (
                <svg
                  viewBox={`0 0 ${width} ${height}`}
                  preserveAspectRatio="none"
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  style={{ mixBlendMode: "difference" }}
                  aria-hidden
                >
                  {lines.map((l, i) => (
                    <line
                      key={i}
                      x1={l.x1}
                      y1={l.y1}
                      x2={l.x2}
                      y2={l.y2}
                      stroke="white"
                      strokeWidth={1}
                      strokeOpacity={0.8}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </svg>
              )}
            </div>
          </div>
        </div>

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
    </div>
  );
}
