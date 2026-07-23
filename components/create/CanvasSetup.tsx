"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { Icon } from "@/components/ui/Icon";
import {
  formatCanvasSize,
  type CanvasFit,
  type CanvasSpec,
  type CanvasUnit,
} from "@/lib/canvas/spec";

interface Props {
  file: File;
  onBack: () => void;
  onReady: (file: File, canvas: CanvasSpec) => void;
}

interface Preset {
  id: string;
  label: string;
  short: number;
  long: number;
  unit: CanvasUnit;
}

interface Point {
  x: number;
  y: number;
}

type Gesture =
  | { kind: "drag"; pointerId: number; x: number; y: number; pan: Point }
  | { kind: "pinch"; distance: number; zoom: number }
  | null;

const PRESETS: Preset[] = [
  { id: "8x10", label: "8 × 10", short: 8, long: 10, unit: "in" },
  { id: "9x12", label: "9 × 12", short: 9, long: 12, unit: "in" },
  { id: "11x14", label: "11 × 14", short: 11, long: 14, unit: "in" },
  { id: "12x16", label: "12 × 16", short: 12, long: 16, unit: "in" },
  { id: "16x20", label: "16 × 20", short: 16, long: 20, unit: "in" },
  { id: "square", label: "12 × 12", short: 12, long: 12, unit: "in" },
  { id: "a4", label: "A4", short: 21, long: 29.7, unit: "cm" },
];

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const PREVIEW_MAX_HEIGHT = 330;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

async function framedPhoto(
  file: File,
  canvasSpec: CanvasSpec,
  zoom: number,
  pan: Point,
): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const ratio = canvasSpec.width / canvasSpec.height;
    const sourceMax = Math.max(bitmap.width, bitmap.height);
    const outputMax = Math.max(1, Math.min(3200, sourceMax));
    const outputWidth = Math.max(1, Math.round(ratio >= 1 ? outputMax : outputMax * ratio));
    const outputHeight = Math.max(1, Math.round(ratio >= 1 ? outputMax / ratio : outputMax));
    const output = document.createElement("canvas");
    output.width = outputWidth;
    output.height = outputHeight;
    const context = output.getContext("2d");
    if (!context) throw new Error("Could not prepare this canvas.");

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    if (canvasSpec.fit === "fit") {
      context.fillStyle = "#f4efe6";
      context.fillRect(0, 0, outputWidth, outputHeight);
      const scale = Math.min(outputWidth / bitmap.width, outputHeight / bitmap.height);
      const width = bitmap.width * scale;
      const height = bitmap.height * scale;
      context.drawImage(bitmap, (outputWidth - width) / 2, (outputHeight - height) / 2, width, height);
    } else {
      const sourceRatio = bitmap.width / bitmap.height;
      let cropWidth: number;
      let cropHeight: number;
      if (sourceRatio > ratio) {
        cropHeight = bitmap.height;
        cropWidth = cropHeight * ratio;
      } else {
        cropWidth = bitmap.width;
        cropHeight = cropWidth / ratio;
      }
      cropWidth /= zoom;
      cropHeight /= zoom;
      const sourceX = ((bitmap.width - cropWidth) * (pan.x + 1)) / 2;
      const sourceY = ((bitmap.height - cropHeight) * (pan.y + 1)) / 2;
      context.drawImage(
        bitmap,
        sourceX,
        sourceY,
        cropWidth,
        cropHeight,
        0,
        0,
        outputWidth,
        outputHeight,
      );
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      output.toBlob(
        (value) => (value ? resolve(value) : reject(new Error("Could not prepare this photo."))),
        "image/jpeg",
        0.94,
      );
    });
    const stem = file.name.replace(/\.[^.]+$/, "") || "reference";
    return new File([blob], `${stem}-huely-canvas.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}

/** Physical canvas selection and non-destructive photo framing before processing. */
export function CanvasSetup({ file, onBack, onReady }: Props) {
  const previewAreaRef = useRef<HTMLDivElement>(null);
  const pointersRef = useRef(new Map<number, Point>());
  const gestureRef = useRef<Gesture>(null);
  const zoomRef = useRef(1);
  const panRef = useRef<Point>({ x: 0, y: 0 });

  const [previewUrl, setPreviewUrl] = useState("");
  const [source, setSource] = useState({ width: 0, height: 0 });
  const [previewWidth, setPreviewWidth] = useState(320);
  const [presetId, setPresetId] = useState("8x10");
  const [shortSide, setShortSide] = useState(8);
  const [longSide, setLongSide] = useState(10);
  const [unit, setUnit] = useState<CanvasUnit>("in");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [fit, setFit] = useState<CanvasFit>("fill");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    let active = true;
    createImageBitmap(file)
      .then((bitmap) => {
        if (active) {
          setPreviewUrl(url);
          setSource({ width: bitmap.width, height: bitmap.height });
        }
        bitmap.close();
      })
      .catch(() => {
        if (active) setError("Huely couldn't read this photo.");
      });
    return () => {
      active = false;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    const area = previewAreaRef.current;
    if (!area) return;
    const update = () => setPreviewWidth(Math.max(1, area.clientWidth));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(area);
    return () => observer.disconnect();
  }, []);

  const low = Math.max(0.5, Math.min(shortSide, longSide));
  const high = Math.max(low, Math.max(shortSide, longSide));
  const canvasSpec = useMemo<CanvasSpec>(
    () => ({
      width: orientation === "portrait" ? low : high,
      height: orientation === "portrait" ? high : low,
      unit,
      fit,
    }),
    [fit, high, low, orientation, unit],
  );
  const ratio = canvasSpec.width / canvasSpec.height;
  const frameWidth = Math.min(previewWidth, PREVIEW_MAX_HEIGHT * ratio);
  const frameHeight = frameWidth / ratio;

  const preview = useMemo(() => {
    if (!source.width || !source.height) {
      return { width: frameWidth, height: frameHeight, left: 0, top: 0 };
    }
    const baseScale =
      fit === "fill"
        ? Math.max(frameWidth / source.width, frameHeight / source.height)
        : Math.min(frameWidth / source.width, frameHeight / source.height);
    const activeZoom = fit === "fill" ? zoom : 1;
    const width = source.width * baseScale * activeZoom;
    const height = source.height * baseScale * activeZoom;
    const overflowX = Math.max(0, width - frameWidth);
    const overflowY = Math.max(0, height - frameHeight);
    return {
      width,
      height,
      left: (frameWidth - width) / 2 - (fit === "fill" ? pan.x * overflowX * 0.5 : 0),
      top: (frameHeight - height) / 2 - (fit === "fill" ? pan.y * overflowY * 0.5 : 0),
    };
  }, [fit, frameHeight, frameWidth, pan.x, pan.y, source.height, source.width, zoom]);

  const resetPosition = () => {
    zoomRef.current = 1;
    panRef.current = { x: 0, y: 0 };
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const changeZoom = (value: number) => {
    const next = clamp(value, MIN_ZOOM, MAX_ZOOM);
    zoomRef.current = next;
    setZoom(next);
  };

  const changePan = (next: Point) => {
    const clamped = { x: clamp(next.x, -1, 1), y: clamp(next.y, -1, 1) };
    panRef.current = clamped;
    setPan(clamped);
  };

  const choosePreset = (preset: Preset) => {
    setPresetId(preset.id);
    setShortSide(preset.short);
    setLongSide(preset.long);
    setUnit(preset.unit);
    resetPosition();
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (fit !== "fill" || preparing) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointersRef.current.values()];
    if (points.length === 1) {
      gestureRef.current = {
        kind: "drag",
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        pan: panRef.current,
      };
    } else if (points.length >= 2) {
      gestureRef.current = {
        kind: "pinch",
        distance: Math.max(1, distance(points[0], points[1])),
        zoom: zoomRef.current,
      };
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId) || fit !== "fill") return;
    event.preventDefault();
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointersRef.current.values()];
    const gesture = gestureRef.current;
    if (points.length >= 2) {
      if (gesture?.kind === "pinch") {
        changeZoom(gesture.zoom * (distance(points[0], points[1]) / gesture.distance));
      }
      return;
    }
    if (gesture?.kind !== "drag" || gesture.pointerId !== event.pointerId) return;
    const overflowX = Math.max(0, preview.width - frameWidth);
    const overflowY = Math.max(0, preview.height - frameHeight);
    const deltaX = event.clientX - gesture.x;
    const deltaY = event.clientY - gesture.y;
    changePan({
      x: overflowX ? gesture.pan.x - (deltaX * 2) / overflowX : 0,
      y: overflowY ? gesture.pan.y - (deltaY * 2) / overflowY : 0,
    });
  };

  const finishPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    const remaining = [...pointersRef.current.entries()];
    if (remaining.length === 1) {
      const [pointerId, point] = remaining[0];
      gestureRef.current = {
        kind: "drag",
        pointerId,
        x: point.x,
        y: point.y,
        pan: panRef.current,
      };
    } else if (!remaining.length) {
      gestureRef.current = null;
    }
  };

  const onWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (fit !== "fill") return;
    event.preventDefault();
    changeZoom(zoomRef.current * (event.deltaY < 0 ? 1.12 : 1 / 1.12));
  };

  const confirm = async () => {
    if (!source.width || !source.height || preparing) return;
    setPreparing(true);
    setError(null);
    try {
      const prepared = await framedPhoto(file, canvasSpec, zoomRef.current, panRef.current);
      onReady(prepared, canvasSpec);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not prepare this canvas.");
      setPreparing(false);
    }
  };

  const square = Math.abs(low - high) < 0.001;

  return (
    <div className="pb-3">
      <header className="flex items-start gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          aria-label="Choose another photo"
          className="mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-full border border-[var(--line)] bg-[var(--card)] text-[var(--ink-soft)]"
        >
          <Icon name="arrowLeft" size={17} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="ui-eyebrow text-[var(--accent)]">Canvas setup</p>
          <h1 className="mt-1 text-[23px] font-bold leading-tight tracking-[-0.025em]">Fit the photo to your canvas</h1>
          <p className="mt-1 text-[12px] text-[var(--ink-soft)]">No stretching—only crop or clean margins.</p>
        </div>
      </header>

      <div ref={previewAreaRef} className="mt-5 flex min-h-[220px] w-full items-center justify-center rounded-[22px] bg-[var(--paper-2)] p-3">
        <div
          role="region"
          aria-label={`Photo framed for a ${formatCanvasSize(canvasSpec)} canvas`}
          className="relative touch-none overflow-hidden bg-[#f4efe6] shadow-[0_16px_36px_rgba(43,39,35,0.18)]"
          style={{
            width: frameWidth,
            height: frameHeight,
            cursor: fit === "fill" ? "grab" : "default",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finishPointer}
          onPointerCancel={finishPointer}
          onWheel={onWheel}
        >
          {previewUrl && source.width > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Canvas framing preview"
              draggable={false}
              className="pointer-events-none absolute max-w-none select-none"
              style={{
                width: preview.width,
                height: preview.height,
                left: preview.left,
                top: preview.top,
              }}
            />
          ) : (
            <div className="shimmer absolute inset-0 bg-[var(--paper-2)]" />
          )}
          <span className="pointer-events-none absolute inset-0 border-2 border-white/80 shadow-[inset_0_0_0_1px_rgba(43,39,35,0.2)]" />
          <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
            {formatCanvasSize(canvasSpec)}
          </span>
          {fit === "fill" && (
            <span className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[10px] font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              Drag or pinch to frame
            </span>
          )}
        </div>
      </div>

      <section className="mt-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-[14px] font-bold">Canvas size</h2>
          <span className="text-[11px] font-semibold text-[var(--ink-soft)]">{formatCanvasSize(canvasSpec)}</span>
        </div>
        <div className="project-rail -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => choosePreset(preset)}
              aria-pressed={presetId === preset.id}
              className={`flex-none rounded-full border px-3 py-2 text-[12px] font-semibold transition ${
                presetId === preset.id
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-[var(--line)] bg-[var(--card)] text-[var(--ink-soft)]"
              }`}
            >
              {preset.label}{preset.id === "a4" ? "" : " in"}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPresetId("custom")}
            aria-pressed={presetId === "custom"}
            className={`flex-none rounded-full border px-3 py-2 text-[12px] font-semibold transition ${
              presetId === "custom"
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-[var(--line)] bg-[var(--card)] text-[var(--ink-soft)]"
            }`}
          >
            Custom
          </button>
        </div>

        {presetId === "custom" && (
          <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2 rounded-[16px] border border-[var(--line)] bg-[var(--card)] p-3">
            <label className="text-[10px] font-semibold text-[var(--ink-soft)]">
              Short side
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={shortSide}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isFinite(value) && value > 0) setShortSide(value);
                }}
                className="mt-1 w-full rounded-[10px] border border-[var(--line)] bg-[var(--card-2)] px-2.5 py-2 text-[13px] font-semibold outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="text-[10px] font-semibold text-[var(--ink-soft)]">
              Long side
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={longSide}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isFinite(value) && value > 0) setLongSide(value);
                }}
                className="mt-1 w-full rounded-[10px] border border-[var(--line)] bg-[var(--card-2)] px-2.5 py-2 text-[13px] font-semibold outline-none focus:border-[var(--accent)]"
              />
            </label>
            <div className="self-end rounded-[10px] bg-[var(--paper-2)] p-1">
              {(["in", "cm"] as const).map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setUnit(choice)}
                  className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold ${
                    unit === choice ? "bg-[var(--card-2)] text-[var(--ink)] shadow-sm" : "text-[var(--ink-soft)]"
                  }`}
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <section>
          <h2 className="mb-2 text-[12px] font-bold">Orientation</h2>
          <div className="grid grid-cols-2 rounded-[12px] bg-[var(--paper-2)] p-1">
            {(["portrait", "landscape"] as const).map((choice) => (
              <button
                key={choice}
                type="button"
                disabled={square}
                onClick={() => {
                  setOrientation(choice);
                  resetPosition();
                }}
                className={`rounded-[9px] px-2 py-2 text-[11px] font-semibold capitalize transition disabled:opacity-45 ${
                  orientation === choice ? "bg-[var(--card-2)] text-[var(--ink)] shadow-sm" : "text-[var(--ink-soft)]"
                }`}
              >
                {choice}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-[12px] font-bold">Photo fit</h2>
          <div className="grid grid-cols-2 rounded-[12px] bg-[var(--paper-2)] p-1">
            {(
              [
                ["fill", "Fill"],
                ["fit", "Whole"],
              ] as const
            ).map(([choice, label]) => (
              <button
                key={choice}
                type="button"
                onClick={() => {
                  setFit(choice);
                  resetPosition();
                }}
                className={`rounded-[9px] px-2 py-2 text-[11px] font-semibold transition ${
                  fit === choice ? "bg-[var(--card-2)] text-[var(--ink)] shadow-sm" : "text-[var(--ink-soft)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      </div>

      {fit === "fill" && (
        <label className="mt-4 flex items-center gap-3 rounded-[14px] border border-[var(--line)] bg-[var(--card)] px-3 py-3">
          <Icon name="zoomIn" size={16} className="flex-none text-[var(--ink-soft)]" />
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step="0.01"
            value={zoom}
            onChange={(event) => changeZoom(Number(event.target.value))}
            className="h-1 min-w-0 flex-1 accent-[var(--accent)]"
            aria-label="Photo crop zoom"
          />
          <output className="w-10 flex-none text-right text-[11px] font-semibold tabular-nums text-[var(--ink-soft)]">
            {zoom.toFixed(1)}×
          </output>
        </label>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-[12px] border border-[var(--accent)] bg-[var(--card)] px-3 py-2 text-[12px] text-[var(--accent)]">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={confirm}
        disabled={!source.width || preparing}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--accent)] px-4 py-3.5 text-[13px] font-semibold text-white shadow-[var(--shadow-sm)] transition active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
      >
        {preparing ? "Preparing canvas…" : "Use this canvas"}
        {!preparing && <Icon name="arrowRight" size={16} />}
      </button>
    </div>
  );
}
