"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { HistoryProject } from "@/lib/history/types";
import { localList } from "@/lib/history/local";
import { cloudList } from "@/lib/history/cloud";

interface Props {
  onFile: (file: File) => void;
  onOpenProject: (id: string) => void;
  authed: boolean;
  error?: string | null;
}

/** Upload screen — hero, dropzone (choose / take / drag / paste), privacy line.
 *  Returning users see a "Recent" row instead of the steps list (spec 03). */
export function Uploader({ onFile, onOpenProject, authed, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [recent, setRecent] = useState<HistoryProject[]>([]);

  useEffect(() => {
    (authed ? cloudList() : localList())
      .then((items) => setRecent(items.slice(0, 3)))
      .catch(() => setRecent([]));
  }, [authed]);

  // Paste support: ⌘/Ctrl+V an image anywhere on the upload screen.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith("image/"),
      );
      const file = item?.getAsFile();
      if (file) onFile(file);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [onFile]);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[34px] font-extrabold leading-tight tracking-[-0.03em]">
          Paint it for real.
        </h1>
        <p className="mt-2 max-w-[38ch] text-[15px] text-[var(--ink-soft)]">
          A photo becomes an oil-paint reference and the exact colors to mix by hand.
        </p>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        className={`block w-full rounded-[18px] border-2 border-dashed bg-[var(--card)] p-12 text-center shadow-[var(--shadow-sm)] transition active:scale-[0.995] ${
          drag ? "border-[var(--accent)] bg-[var(--card-2)]" : "border-[var(--line)] hover:border-[var(--accent)]"
        }`}
      >
        <div className="text-4xl">🖼️</div>
        <p className="mt-3 text-[17px] font-bold">Choose a photo</p>
        <p className="text-[13px] text-[var(--ink-soft)]">From your gallery or files · or drag &amp; paste</p>
      </button>

      <button
        type="button"
        onClick={() => cameraRef.current?.click()}
        className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-[14px] border border-[var(--line)] bg-[var(--card)] px-4 py-3 text-[14px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-[0.99]"
      >
        <span className="text-[17px]">📷</span> Take a photo instead
      </button>

      {/* No `capture` here — that would force the camera and hide the gallery. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      {/* Dedicated camera path for when you do want to shoot straight away. */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />

      {error && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-[var(--accent)] p-3 text-[13px]"
          style={{ background: "color-mix(in srgb, var(--accent) 6%, var(--card))" }}
        >
          <span
            className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[9px] font-bold text-[var(--accent)]"
            style={{ background: "color-mix(in srgb, var(--accent) 14%, var(--card))" }}
          >
            !
          </span>
          <span className="text-[var(--ink-soft)]">
            <b className="text-[var(--ink)]">{error}</b> · Try another photo
          </span>
        </div>
      )}

      <p className="mt-4 text-center text-[13px] text-[var(--ink-soft)]">
        Your photo never leaves your device.
      </p>

      {recent.length > 0 ? (
        <div className="mt-7">
          <div className="mb-2.5 flex items-center justify-between">
            <b className="text-[15px]">Recent</b>
            <Link href="/history" className="text-[13px] font-semibold text-[var(--accent)]">
              All projects →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {recent.map((p) => (
              <button
                key={p.id}
                onClick={() => onOpenProject(p.id)}
                title={p.name}
                className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--card)] text-left shadow-[var(--shadow-sm)] active:scale-[0.97]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumbDataUrl} alt={p.name} className="aspect-[4/3] w-full object-cover" />
                <div className="truncate px-2 py-1.5 text-[11px] font-semibold">{p.name}</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <ol className="mt-7 grid gap-2.5">
          {["Upload a photo", "Get the painting + its colors", "Mix them and paint it for real"].map(
            (step, i) => (
              <li
                key={step}
                className="flex items-center gap-3 rounded-xl bg-[var(--paper-2)] px-3.5 py-3 text-[14px]"
              >
                <span className="grid h-[26px] w-[26px] flex-none place-items-center rounded-full bg-[var(--accent)] text-[12px] font-bold text-white">
                  {i + 1}
                </span>
                {step}
              </li>
            ),
          )}
        </ol>
      )}
    </div>
  );
}
