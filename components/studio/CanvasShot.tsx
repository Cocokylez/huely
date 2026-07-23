"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PipelineResult } from "@/lib/image/types";
import { imageDataToDataUrl } from "@/lib/exports";
import { cacheShot, getCachedShot, removeCachedShot } from "@/lib/history/save";
import { useToast } from "@/components/ui/ToastProvider";
import { Icon, type IconName } from "@/components/ui/Icon";

interface Props {
  projectId: string | null;
  result: PipelineResult;
}

type CompareMode = "split" | "overlay" | "side";

const MODES: { id: CompareMode; label: string; icon: IconName }[] = [
  { id: "split", label: "Split", icon: "compare" },
  { id: "overlay", label: "Overlay", icon: "layers" },
  { id: "side", label: "Side by side", icon: "image" },
];

const SHOT_MAX = 1200;

async function decodePhoto(file: File): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
}> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      // Some mobile browsers expose createImageBitmap but reject camera formats.
    }
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  image.src = objectUrl;
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Photo could not be decoded"));
    });
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    close: () => URL.revokeObjectURL(objectUrl),
  };
}

/** Downscale a captured photo so it stays useful while remaining light in device storage. */
async function fileToShotUrl(file: File): Promise<string> {
  const decoded = await decodePhoto(file);
  try {
    const scale = Math.min(1, SHOT_MAX / Math.max(decoded.width, decoded.height));
    const width = Math.max(1, Math.round(decoded.width * scale));
    const height = Math.max(1, Math.round(decoded.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable");
    context.drawImage(decoded.source, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.88);
  } finally {
    decoded.close();
  }
}

/** Camera check-in plus visual comparison tools for the painter's real canvas. */
export function CanvasShot({ projectId, result }: Props) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const pendingShotRef = useRef<string | null>(null);
  const { toast } = useToast();
  const [shot, setShot] = useState<string | null>(null);
  const [mode, setMode] = useState<CompareMode>("split");
  const [split, setSplit] = useState(50);
  const [opacity, setOpacity] = useState(50);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!projectId) {
      setShot(null);
      return;
    }

    if (pendingShotRef.current) {
      const pending = pendingShotRef.current;
      pendingShotRef.current = null;
      void cacheShot(projectId, pending);
      return;
    }

    getCachedShot(projectId).then((url) => {
      if (!cancelled) setShot(url ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const referenceUrl = useMemo(() => imageDataToDataUrl(result.oil), [result.oil]);
  const aspectRatio = `${result.w} / ${result.h}`;

  const capture = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast("Choose a photo file");
      return;
    }
    setBusy(true);
    try {
      const url = await fileToShotUrl(file);
      setShot(url);
      if (projectId) await cacheShot(projectId, url);
      else pendingShotRef.current = url;
      toast("Canvas photo added");
    } catch {
      toast("Huely couldn't open that photo");
    } finally {
      setBusy(false);
    }
  };

  const removeShot = () => {
    pendingShotRef.current = null;
    setShot(null);
    if (projectId) void removeCachedShot(projectId);
  };

  return (
    <section className="min-w-0">
      <div className="mb-3 flex items-start gap-3">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-[var(--paper-2)] text-[var(--accent)]">
          <Icon name="compare" size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold">Compare your canvas</h2>
          <p className="text-[11px] leading-relaxed text-[var(--ink-soft)]">
            Photograph the real painting, then inspect shape, value, and color against the reference.
          </p>
        </div>
      </div>

      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void capture(file);
          event.target.value = "";
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void capture(file);
          event.target.value = "";
        }}
      />

      {!shot ? (
        <div className="rounded-[18px] border-2 border-dashed border-[var(--line)] bg-[var(--card)] p-4 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-[18px] bg-[var(--paper-2)] text-[var(--accent)]">
            <Icon name="camera" size={24} />
          </span>
          <h3 className="mt-3 text-[14px] font-bold">Add a canvas check-in</h3>
          <p className="mx-auto mt-1 max-w-sm text-[11px] leading-relaxed text-[var(--ink-soft)]">
            Stand square to the canvas in even light. The photo remains on this device.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              disabled={busy}
              className="flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-3 py-3 text-[11px] font-bold text-white disabled:opacity-60"
            >
              <Icon name="camera" size={16} /> {busy ? "Adding…" : "Take photo"}
            </button>
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              disabled={busy}
              className="flex items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--card-2)] px-3 py-3 text-[11px] font-bold text-[var(--ink-soft)] disabled:opacity-60"
            >
              <Icon name="image" size={16} /> Choose photo
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div role="group" aria-label="Comparison mode" className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-[var(--paper-2)] p-1">
            {MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                aria-pressed={mode === item.id}
                className={`flex min-w-0 items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-[9px] font-semibold transition ${
                  mode === item.id
                    ? "bg-[var(--card-2)] text-[var(--accent)] shadow-[var(--shadow-sm)]"
                    : "text-[var(--ink-soft)]"
                }`}
              >
                <Icon name={item.icon} size={14} />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>

          {mode === "side" ? (
            <div className="grid grid-cols-2 gap-2">
              <CompareFrame label="Reference" src={referenceUrl} aspectRatio={aspectRatio} />
              <CompareFrame label="Your canvas" src={shot} aspectRatio={aspectRatio} />
            </div>
          ) : (
            <div>
              <div
                className="relative overflow-hidden rounded-[16px] border border-[var(--line)] bg-[var(--paper-2)]"
                style={{ aspectRatio }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={referenceUrl} alt="Huely reference" className="absolute inset-0 h-full w-full object-contain" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shot}
                  alt="Your photographed canvas"
                  className="absolute inset-0 h-full w-full object-contain"
                  style={
                    mode === "split"
                      ? { clipPath: `inset(0 ${100 - split}% 0 0)` }
                      : { opacity: opacity / 100 }
                  }
                />

                {mode === "split" && (
                  <span
                    className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.25)]"
                    style={{ left: `calc(${split}% - 1px)` }}
                    aria-hidden
                  >
                    <span className="absolute left-1/2 top-1/2 grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white bg-black/55 text-white shadow-md">
                      <Icon name="compare" size={13} />
                    </span>
                  </span>
                )}

                <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[8px] font-bold uppercase tracking-wide text-white">
                  Reference
                </span>
                <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[8px] font-bold uppercase tracking-wide text-white">
                  Canvas
                </span>
              </div>

              <label className="mt-2.5 block rounded-xl bg-[var(--card)] px-3 py-2.5">
                <span className="mb-1.5 flex items-center justify-between text-[10px] font-semibold text-[var(--ink-soft)]">
                  <span>{mode === "split" ? "Reveal your canvas" : "Canvas visibility"}</span>
                  <span>{mode === "split" ? split : opacity}%</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={mode === "split" ? split : opacity}
                  onChange={(event) =>
                    mode === "split" ? setSplit(Number(event.target.value)) : setOpacity(Number(event.target.value))
                  }
                  className="w-full accent-[var(--accent)]"
                  aria-label={mode === "split" ? "Split comparison position" : "Canvas overlay opacity"}
                />
              </label>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-full bg-[var(--ink)] px-3 py-2 text-[10px] font-semibold text-[var(--paper)] disabled:opacity-60"
            >
              <Icon name="camera" size={14} /> {busy ? "Adding…" : "Retake"}
            </button>
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--card-2)] px-3 py-2 text-[10px] font-semibold text-[var(--ink-soft)] disabled:opacity-60"
            >
              <Icon name="image" size={14} /> Choose
            </button>
            <button
              type="button"
              onClick={removeShot}
              className="ml-auto flex items-center gap-1.5 rounded-full px-2 py-2 text-[10px] font-semibold text-[var(--ink-soft)] hover:text-[var(--accent)]"
            >
              <Icon name="trash" size={13} /> Remove
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function CompareFrame({ label, src, aspectRatio }: { label: string; src: string; aspectRatio: string }) {
  return (
    <figure className="m-0 min-w-0">
      <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--paper-2)]" style={{ aspectRatio }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={label} className="h-full w-full object-contain" />
      </div>
      <figcaption className="mt-1.5 truncate text-center text-[9px] font-semibold text-[var(--ink-soft)]">{label}</figcaption>
    </figure>
  );
}
