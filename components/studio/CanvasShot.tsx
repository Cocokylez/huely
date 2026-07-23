"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PipelineResult } from "@/lib/image/types";
import { imageDataToDataUrl } from "@/lib/exports";
import { cacheShot, getCachedShot, removeCachedShot } from "@/lib/history/save";

interface Props {
  projectId: string | null;
  result: PipelineResult;
}

const SHOT_MAX = 900;

/** Downscale a captured photo so it stays small in device storage. */
async function fileToShotUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, SHOT_MAX / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

/**
 * "Your canvas" — snap a photo of the real painting and hold it beside the
 * reference to compare. Stored on-device only, never uploaded.
 */
export function CanvasShot({ projectId, result }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [compare, setCompare] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!projectId) {
      setShot(null);
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

  const capture = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setBusy(true);
    try {
      const url = await fileToShotUrl(file);
      setShot(url);
      if (projectId) await cacheShot(projectId, url);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-[17px] font-bold">Your canvas</h2>
          <p className="text-[12px] text-[var(--ink-soft)]">
            Snap your real painting to compare it with the reference. Stays on your device.
          </p>
        </div>
        {shot && (
          <button
            onClick={() => setCompare((c) => !c)}
            className="flex-none rounded-full border border-[var(--line)] bg-[var(--card-2)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ink-soft)] hover:text-[var(--accent)]"
          >
            {compare ? "Just mine" : "Compare"}
          </button>
        )}
      </div>

      {/* No `capture` — keeps the gallery/files option available. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) capture(f);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) capture(f);
          e.target.value = "";
        }}
      />

      {!shot ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => cameraRef.current?.click()}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-[18px] border-2 border-dashed border-[var(--line)] bg-[var(--card)] p-6 text-[14px] font-semibold text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-60"
          >
            <span className="text-[20px]">📷</span>
            {busy ? "Adding…" : "Take a photo"}
          </button>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-[18px] border-2 border-dashed border-[var(--line)] bg-[var(--card)] p-6 text-[14px] font-semibold text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-60"
          >
            <span className="text-[20px]">🖼️</span>
            Choose a photo
          </button>
        </div>
      ) : (
        <div>
          <div className={compare ? "grid grid-cols-2 gap-2" : ""}>
            {compare && (
              <figure className="m-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={referenceUrl}
                  alt="Reference"
                  className="w-full rounded-[14px] border border-[var(--line)]"
                />
                <figcaption className="mt-1 text-center text-[11px] text-[var(--ink-soft)]">
                  Reference
                </figcaption>
              </figure>
            )}
            <figure className="m-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={shot}
                alt="Your canvas"
                className="w-full rounded-[14px] border border-[var(--line)]"
              />
              <figcaption className="mt-1 text-center text-[11px] text-[var(--ink-soft)]">
                Your canvas
              </figcaption>
            </figure>
          </div>

          <div className="mt-2.5 flex gap-2">
            <button
              onClick={() => cameraRef.current?.click()}
              disabled={busy}
              className="rounded-full border border-[var(--line)] bg-[var(--card-2)] px-3.5 py-2 text-[12px] font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-60"
            >
              {busy ? "Adding…" : "📷 Retake"}
            </button>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="rounded-full border border-[var(--line)] bg-[var(--card-2)] px-3.5 py-2 text-[12px] font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-60"
            >
              🖼️ Choose
            </button>
            <button
              onClick={() => {
                setShot(null);
                if (projectId) removeCachedShot(projectId).catch(() => {});
              }}
              className="rounded-full border border-[var(--line)] bg-[var(--card-2)] px-3.5 py-2 text-[12px] font-semibold text-[var(--ink-soft)] hover:text-[var(--accent)]"
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
