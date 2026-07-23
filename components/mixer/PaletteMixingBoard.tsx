"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { MAX_MIX_SLOTS } from "@/lib/image/constants";
import { hexToRgb } from "@/lib/image/color";
import { nearestName } from "@/lib/image/colorNames";
import type { Paint } from "@/lib/image/recipes";
import { useMixer } from "./MixerProvider";
import { useMixSource } from "./mixSource";
import { useMyPaints } from "./myPaints";

type SourceMode = "tubes" | "project";

interface BoardPoint {
  x: number;
  y: number;
}

interface PaintDrag {
  paint: Paint;
  pointerId: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  moved: boolean;
  overBoard: boolean;
}

type PaintCss = CSSProperties & {
  "--paint": string;
  "--blob-rotation"?: string;
};

const BATCH_OPTIONS = [2, 5, 10, 20] as const;
const DEFAULT_BLOB_POINTS: BoardPoint[] = [
  { x: 30, y: 31 },
  { x: 49, y: 25 },
  { x: 68, y: 35 },
  { x: 25, y: 52 },
  { x: 46, y: 49 },
  { x: 72, y: 53 },
];

function paintStyle(hex: string): PaintCss {
  return { "--paint": hex };
}

function normalizedHex(hex: string): string {
  return hex.toLowerCase();
}

function readablePaintName(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  return nearestName(r, g, b);
}

function formatMl(value: number): string {
  if (value < 0.1) return value.toFixed(2);
  if (value < 10) return value.toFixed(1).replace(/\.0$/, "");
  return Math.round(value).toString();
}

function uniquePaints(paints: Paint[]): Paint[] {
  const seen = new Set<string>();
  return paints.filter((paint) => {
    const hex = normalizedHex(paint.hex);
    if (seen.has(hex)) return false;
    seen.add(hex);
    return true;
  });
}

function safeBoardPoint(point: BoardPoint): BoardPoint {
  let x = Math.max(19, Math.min(80, point.x));
  let y = Math.max(17, Math.min(72, point.y));

  // Keep paint away from the palette's thumb hole and lower hand opening.
  if (y > 59 && x > 53 && x < 73) x = 47;
  if (y > 67 && x > 38 && x < 63) y = 61;

  return { x, y };
}

export function PaletteMixingBoard() {
  const { slots, result, removeSlot, setHex, setParts, addColor, clear } = useMixer();
  const { toast } = useToast();
  const myPaints = useMyPaints();
  const projectPalette = useMixSource();
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<PaintDrag | null>(null);
  const mixingTimerRef = useRef<number | null>(null);
  const [sourceMode, setSourceMode] = useState<SourceMode>("tubes");
  const [batchMl, setBatchMl] = useState(5);
  const [drag, setDrag] = useState<PaintDrag | null>(null);
  const [blobPoints, setBlobPoints] = useState<Record<string, BoardPoint>>({});
  const [mixing, setMixing] = useState(false);
  const [mixed, setMixed] = useState(false);
  const [mixRound, setMixRound] = useState(0);
  const [announcement, setAnnouncement] = useState("");

  const projectPaints = useMemo(
    () =>
      uniquePaints(
        projectPalette.map((color) => ({
          hex: color.hex,
          name: readablePaintName(color.hex),
        })),
    ),
    [projectPalette],
  );
  const activeSourceMode: SourceMode = sourceMode === "project" && projectPaints.length ? "project" : "tubes";
  const sourcePaints = activeSourceMode === "project" ? projectPaints : myPaints;
  const totalParts = slots.reduce((sum, slot) => sum + slot.parts, 0);
  const onePartMl = totalParts ? batchMl / totalParts : 0;

  useEffect(
    () => () => {
      if (mixingTimerRef.current !== null) window.clearTimeout(mixingTimerRef.current);
    },
    [],
  );

  const chooseBatch = (amount: number) => {
    setBatchMl(amount);
  };

  const resetMixVisual = () => {
    if (mixingTimerRef.current !== null) {
      window.clearTimeout(mixingTimerRef.current);
      mixingTimerRef.current = null;
    }
    setMixing(false);
    setMixed(false);
  };

  const setActiveDrag = (next: PaintDrag | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  const isOverBoard = (x: number, y: number): boolean => {
    const rect = boardRef.current?.getBoundingClientRect();
    return !!rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  };

  const pointOnBoard = (x: number, y: number): BoardPoint | null => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return safeBoardPoint({
      x: ((x - rect.left) / rect.width) * 100,
      y: ((y - rect.top) / rect.height) * 100,
    });
  };

  const dropPaint = (paint: Paint, point?: BoardPoint | null) => {
    const hex = normalizedHex(paint.hex);
    const existing = slots.find((slot) => normalizedHex(slot.hex) === hex);
    if (!existing && slots.length >= MAX_MIX_SLOTS) {
      toast(`The palette can hold ${MAX_MIX_SLOTS} colors at once`);
      return;
    }

    if (point) setBlobPoints((current) => ({ ...current, [hex]: safeBoardPoint(point) }));
    resetMixVisual();
    addColor(hex);
    setAnnouncement(
      `${paint.name} ${existing ? `increased to ${Math.min(9, existing.parts + 1)} parts` : "added to the palette"}`,
    );
  };

  const startPaintDrag = (event: ReactPointerEvent<HTMLButtonElement>, paint: Paint) => {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setActiveDrag({
      paint,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      overBoard: isOverBoard(event.clientX, event.clientY),
    });
  };

  const movePaintDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = dragRef.current;
    if (!current || current.pointerId !== event.pointerId) return;
    event.preventDefault();
    const moved = current.moved || Math.hypot(event.clientX - current.startX, event.clientY - current.startY) > 6;
    setActiveDrag({
      ...current,
      x: event.clientX,
      y: event.clientY,
      moved,
      overBoard: isOverBoard(event.clientX, event.clientY),
    });
  };

  const finishPaintDrag = (event: ReactPointerEvent<HTMLButtonElement>, cancelled = false) => {
    const current = dragRef.current;
    if (!current || current.pointerId !== event.pointerId) return;
    event.preventDefault();
    const overBoard = isOverBoard(event.clientX, event.clientY);
    if (!cancelled && (overBoard || !current.moved)) {
      dropPaint(current.paint, overBoard ? pointOnBoard(event.clientX, event.clientY) : null);
    }
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture is released automatically when the gesture ends.
    }
    setActiveDrag(null);
  };

  const mixOnPalette = () => {
    if (!result || slots.length < 2) return;
    if (mixingTimerRef.current !== null) window.clearTimeout(mixingTimerRef.current);
    setMixRound((round) => round + 1);
    setMixed(false);
    setMixing(true);
    setAnnouncement(`Mixing ${result.name}`);
    mixingTimerRef.current = window.setTimeout(() => {
      setMixing(false);
      setMixed(true);
      setAnnouncement(`${result.name} is ready`);
      mixingTimerRef.current = null;
    }, 720);
  };

  const copyResult = () => {
    if (!result) return;
    void navigator.clipboard?.writeText(result.hex);
    toast(`Copied ${result.hex}`);
  };

  const clearPalette = () => {
    resetMixVisual();
    clear();
    setBlobPoints({});
  };

  const changePaintColor = (index: number, hex: string) => {
    resetMixVisual();
    setHex(index, hex);
  };

  const changePaintParts = (index: number, parts: number) => {
    resetMixVisual();
    setParts(index, parts);
  };

  const removePaint = (index: number) => {
    const hex = normalizedHex(slots[index].hex);
    resetMixVisual();
    removeSlot(index);
    setBlobPoints((current) => {
      const next = { ...current };
      delete next[hex];
      return next;
    });
  };

  return (
    <div className="mx-auto grid max-w-[860px] gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(250px,0.85fr)] md:items-start">
      <section className="min-w-0 rounded-[22px] border border-[var(--line)] bg-[var(--card)] p-3 shadow-[var(--shadow-sm)] sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold">Your paint shelf</h3>
            <p className="text-[11px] text-[var(--ink-soft)]">Drag a color onto the wood, or tap to add one part.</p>
          </div>
          {projectPaints.length > 0 && (
            <div className="flex flex-none rounded-full bg-[var(--paper-2)] p-1" role="group" aria-label="Paint source">
              <button
                type="button"
                onClick={() => setSourceMode("tubes")}
                aria-pressed={activeSourceMode === "tubes"}
                className={`rounded-full px-2.5 py-1.5 text-[10px] font-bold transition ${
                  activeSourceMode === "tubes" ? "bg-[var(--card-2)] text-[var(--accent)] shadow-[var(--shadow-sm)]" : "text-[var(--ink-soft)]"
                }`}
              >
                Tubes
              </button>
              <button
                type="button"
                onClick={() => setSourceMode("project")}
                aria-pressed={activeSourceMode === "project"}
                className={`rounded-full px-2.5 py-1.5 text-[10px] font-bold transition ${
                  activeSourceMode === "project" ? "bg-[var(--card-2)] text-[var(--accent)] shadow-[var(--shadow-sm)]" : "text-[var(--ink-soft)]"
                }`}
              >
                Project
              </button>
            </div>
          )}
        </div>

        <div className="paint-source-rail -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-2">
          {sourcePaints.map((paint) => (
            <button
              key={`${activeSourceMode}-${paint.name}-${paint.hex}`}
              type="button"
              title={`Drag or tap ${paint.name}`}
              aria-label={`Drag or tap ${paint.name} to add paint`}
              onPointerDown={(event) => startPaintDrag(event, paint)}
              onPointerMove={movePaintDrag}
              onPointerUp={(event) => finishPaintDrag(event)}
              onPointerCancel={(event) => finishPaintDrag(event, true)}
              onClick={(event) => {
                if (event.detail === 0) dropPaint(paint);
              }}
              className="group flex w-[62px] flex-none touch-none select-none flex-col items-center gap-1.5 rounded-2xl border border-transparent px-1 py-2 transition hover:border-[var(--line)] hover:bg-[var(--card-2)] focus-visible:bg-[var(--card-2)]"
            >
              <span className="paint-source-daub" style={paintStyle(paint.hex)} aria-hidden />
              <span className="w-full truncate text-center text-[9px] font-semibold text-[var(--ink-soft)] group-hover:text-[var(--ink)]">
                {paint.name}
              </span>
            </button>
          ))}
          <label className="group flex w-[62px] flex-none cursor-pointer flex-col items-center gap-1.5 rounded-2xl border border-transparent px-1 py-2 transition hover:border-[var(--line)] hover:bg-[var(--card-2)]">
            <span className="grid h-10 w-10 place-items-center rounded-[46%_54%_48%_52%] border border-dashed border-[var(--line)] bg-[var(--paper-2)] text-[var(--accent)]">
              <Icon name="plus" size={15} />
            </span>
            <span className="text-[9px] font-semibold text-[var(--ink-soft)]">Custom</span>
            <input
              type="color"
              defaultValue="#7f7f7f"
              aria-label="Choose a custom paint color"
              className="sr-only"
              onChange={(event) =>
                dropPaint({ hex: event.target.value, name: readablePaintName(event.target.value) })
              }
            />
          </label>
        </div>

        <div className="relative mx-auto mt-1 aspect-square w-full max-w-[470px] select-none" ref={boardRef} role="group" aria-label="Wooden paint mixing palette">
          <div className={`palette-drop-halo absolute inset-[5%] rounded-[46%] ${drag?.overBoard ? "is-active" : ""}`} aria-hidden />
          <Image
            src="/art/mixing-palette.webp"
            alt=""
            width={900}
            height={900}
            draggable={false}
            priority
            className="palette-wood absolute inset-0 h-full w-full object-contain"
          />

          <span className={`palette-brush-prop palette-brush-prop--right ${mixing ? "is-stirring" : ""}`} aria-hidden>
            <Image src="/art/paint-brush.webp" alt="" width={900} height={900} draggable={false} />
          </span>
          <span className="palette-brush-prop palette-brush-prop--left" aria-hidden>
            <Image src="/art/paint-brush.webp" alt="" width={900} height={900} draggable={false} />
          </span>

          {slots.map((slot, index) => {
            const point = blobPoints[normalizedHex(slot.hex)] ?? DEFAULT_BLOB_POINTS[index % DEFAULT_BLOB_POINTS.length];
            const gathered = mixing || mixed;
            const size = Math.min(78, 43 + slot.parts * 5);
            const style: PaintCss = {
              ...paintStyle(slot.hex),
              "--blob-rotation": `${-13 + ((index * 19) % 27)}deg`,
              left: `${gathered ? 48 : point.x}%`,
              top: `${gathered ? 49 : point.y}%`,
              width: size,
              height: Math.round(size * 0.72),
            };
            return (
              <span
                key={`${normalizedHex(slot.hex)}-${index}`}
                className="palette-paint-blob"
                data-gathered={gathered || undefined}
                style={style}
                aria-hidden
              >
                <span>{slot.parts}×</span>
              </span>
            );
          })}

          {result && (mixing || mixed) && (
            <span
              key={mixRound}
              className={`palette-mixed-smear ${mixed ? "is-ready" : "is-forming"}`}
              style={paintStyle(result.hex)}
              aria-hidden
            />
          )}

          {slots.length === 0 && (
            <span className="pointer-events-none absolute left-1/2 top-[45%] z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[rgba(255,253,249,0.84)] text-[var(--accent)] shadow-[var(--shadow-sm)] backdrop-blur-sm">
                <Icon name="palette" size={20} />
              </span>
              <span className="mt-2 rounded-full bg-[rgba(255,253,249,0.84)] px-3 py-1.5 text-[10px] font-bold text-[#574535] shadow-[var(--shadow-sm)] backdrop-blur-sm">
                Drop paint here
              </span>
            </span>
          )}

          {drag?.overBoard && (
            <span className="pointer-events-none absolute left-1/2 top-[46%] z-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--ink)] px-3 py-2 text-[10px] font-bold text-[var(--paper)] shadow-lg">
              Release to add
            </span>
          )}
        </div>
      </section>

      <div className="grid min-w-0 content-start gap-3">
        <section className="rounded-[20px] border border-[var(--line)] bg-[var(--card-2)] p-3.5 shadow-[var(--shadow-sm)]" aria-live="polite">
          <div className="flex items-center gap-3">
            <span className="paint-result-daub" style={paintStyle(result?.hex ?? "#d8cdbd")} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ink-soft)]">Your mixture</p>
              <h3 className="truncate text-[16px] font-bold">{result?.name ?? "Add paint colors"}</h3>
              <p className="font-mono text-[11px] text-[var(--ink-soft)]">{result?.hex ?? "No mixture yet"}</p>
            </div>
            <button
              type="button"
              onClick={copyResult}
              disabled={!result}
              aria-label="Copy mixed color"
              className="grid h-9 w-9 flex-none place-items-center rounded-full border border-[var(--line)] bg-[var(--paper-2)] text-[var(--ink-soft)] disabled:opacity-35"
            >
              <Icon name="copy" size={15} />
            </button>
          </div>
        </section>

        <section className="rounded-[20px] border border-[var(--line)] bg-[var(--card)] p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[14px] font-bold">How much paint?</h3>
              <p className="text-[10px] text-[var(--ink-soft)]">Choose the total batch.</p>
            </div>
            <strong className="text-[18px] tracking-[-0.02em]">{batchMl} mL</strong>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1.5" role="group" aria-label="Total paint amount">
            {BATCH_OPTIONS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => chooseBatch(amount)}
                aria-pressed={batchMl === amount}
                className={`rounded-xl py-2 text-[11px] font-bold transition ${
                  batchMl === amount
                    ? "bg-[var(--ink)] text-[var(--paper)]"
                    : "bg-[var(--paper-2)] text-[var(--ink-soft)] hover:text-[var(--ink)]"
                }`}
              >
                {amount} mL
              </button>
            ))}
          </div>
          {totalParts > 0 && (
            <p className="mt-2 text-[10px] text-[var(--ink-soft)]">
              1 part = <b className="text-[var(--ink)]">{formatMl(onePartMl)} mL</b>
            </p>
          )}
        </section>

        <section className="rounded-[20px] border border-[var(--line)] bg-[var(--card)] p-3.5">
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[14px] font-bold">Paint recipe</h3>
              <p className="text-[10px] text-[var(--ink-soft)]">Parts stay exact as batch size changes.</p>
            </div>
            {slots.length > 0 && (
              <button type="button" onClick={clearPalette} className="text-[10px] font-bold text-[var(--ink-soft)] hover:text-[var(--accent)]">
                Clear
              </button>
            )}
          </div>

          {slots.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--line)] px-3 py-5 text-center text-[11px] text-[var(--ink-soft)]">
              Add at least two colors to start.
            </div>
          ) : (
            <div className="grid gap-2">
              {slots.map((slot, index) => {
                const amount = onePartMl * slot.parts;
                const name = readablePaintName(slot.hex);
                return (
                  <div key={`${slot.hex}-${index}`} className="grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl bg-[var(--card-2)] p-2">
                    <label className="relative h-9 w-9 cursor-pointer">
                      <span className="paint-mini-daub block h-full w-full" style={paintStyle(slot.hex)} aria-hidden />
                      <input
                        type="color"
                        value={slot.hex}
                        onChange={(event) => changePaintColor(index, event.target.value)}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        aria-label={`Change ${name}`}
                      />
                    </label>
                    <div className="min-w-0">
                      <b className="block truncate text-[11px]">{name}</b>
                      <span className="text-[10px] text-[var(--ink-soft)]">
                        {slot.parts} {slot.parts === 1 ? "part" : "parts"} · {formatMl(amount)} mL
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => changePaintParts(index, slot.parts - 1)}
                        aria-label={`Use less ${name}`}
                        className="grid h-8 w-8 place-items-center rounded-full bg-[var(--paper-2)] text-[var(--ink-soft)] hover:text-[var(--ink)]"
                      >
                        <Icon name="minus" size={13} />
                      </button>
                      <span className="min-w-5 text-center text-[11px] font-bold">{slot.parts}</span>
                      <button
                        type="button"
                        onClick={() => changePaintParts(index, slot.parts + 1)}
                        aria-label={`Use more ${name}`}
                        className="grid h-8 w-8 place-items-center rounded-full bg-[var(--paper-2)] text-[var(--ink-soft)] hover:text-[var(--ink)]"
                      >
                        <Icon name="plus" size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removePaint(index)}
                        aria-label={`Remove ${name}`}
                        className="grid h-8 w-7 place-items-center rounded-full text-[var(--ink-soft)] hover:text-[var(--accent)]"
                      >
                        <Icon name="x" size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <button
          type="button"
          onClick={mixOnPalette}
          disabled={slots.length < 2 || !result || mixing}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-4 py-3.5 text-[12px] font-bold text-white shadow-[0_8px_20px_color-mix(in_srgb,var(--accent)_24%,transparent)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Icon name={mixing ? "sparkles" : "brush"} size={16} />
          {mixing ? "Mixing…" : mixed ? "Mix again" : "Mix on palette"}
        </button>

        <p className="px-1 text-[10px] leading-relaxed text-[var(--ink-soft)]">
          Measure each part with the same scoop or syringe. Huely uses mL because pigment weights differ between colors.
        </p>
      </div>

      {drag && (
        <span
          className="pointer-events-none fixed z-[90] -translate-x-1/2 -translate-y-1/2"
          style={{ left: drag.x, top: drag.y }}
          aria-hidden
        >
          <span className="paint-drag-preview" style={paintStyle(drag.paint.hex)} />
        </span>
      )}
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
