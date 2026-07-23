"use client";

import { useEffect, useRef, useState } from "react";
import type { ImageQuality } from "@/lib/image/types";
import { IMAGE_QUALITY_OPTIONS } from "@/lib/image/quality";
import { Icon } from "@/components/ui/Icon";

interface Props {
  onFile: (file: File) => void;
  quality: ImageQuality;
  onQuality: (quality: ImageQuality) => void;
  error?: string | null;
}

/** Direct-create fallback for visits that did not start from the center plus sheet. */
export function Uploader({ onFile, quality, onQuality, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const qualityDescription =
    IMAGE_QUALITY_OPTIONS.find((option) => option.id === quality)?.description ??
    IMAGE_QUALITY_OPTIONS[0].description;

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
      <header className="mb-5 pt-1">
        <h1 className="ui-page-title">New project</h1>
        <p className="ui-body mt-1.5 text-[var(--ink-soft)]">Choose a photo to build your painting reference and palette.</p>
      </header>

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
        className={`group block w-full rounded-[20px] border-2 border-dashed bg-[var(--card)] px-6 py-9 text-center shadow-[var(--shadow-sm)] transition active:scale-[0.995] ${
          drag ? "border-[var(--accent)] bg-[var(--card-2)]" : "border-[var(--line)] hover:border-[var(--accent)]"
        }`}
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-[18px] bg-[var(--paper-2)] text-[var(--accent)] transition group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-sm)]">
          <Icon name="imagePlus" size={25} />
        </div>
        <p className="mt-3 text-[16px] font-bold">Choose a reference photo</p>
        <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">Gallery, files, drag, or paste</p>
      </button>

      <button
        type="button"
        onClick={() => cameraRef.current?.click()}
        className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--ink)] px-4 py-3 text-[13px] font-semibold text-[var(--paper)] shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 active:scale-[0.99]"
      >
        <Icon name="camera" size={18} /> Take a photo instead
      </button>

      <label className="mt-2.5 flex items-center gap-3 rounded-[14px] border border-[var(--line)] bg-[var(--paper-2)] px-3.5 py-3">
        <span className="min-w-0 flex-1">
          <b className="block text-[12px]">Image detail</b>
          <span className="block text-[11px] leading-relaxed text-[var(--ink-soft)]">
            {qualityDescription}
          </span>
        </span>
        <select
          value={quality}
          onChange={(event) => onQuality(event.target.value as ImageQuality)}
          className="flex-none rounded-lg border border-[var(--line)] bg-[var(--card-2)] px-2.5 py-2 text-[12px] font-semibold text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          aria-label="Image processing detail"
        >
          {IMAGE_QUALITY_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

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
        <div role="alert" className="mt-4 flex items-center gap-3 rounded-xl border border-[var(--accent)] p-3 text-[13px]"
          style={{ background: "color-mix(in srgb, var(--accent) 6%, var(--card))" }}
        >
          <span
            className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[9px] text-[var(--accent)]"
            style={{ background: "color-mix(in srgb, var(--accent) 14%, var(--card))" }}
          >
            <Icon name="help" size={17} />
          </span>
          <span className="text-[var(--ink-soft)]">
            <b className="text-[var(--ink)]">{error}</b> · Try another photo
          </span>
        </div>
      )}

    </div>
  );
}
