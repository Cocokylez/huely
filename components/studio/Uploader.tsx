"use client";

import { useRef, useState } from "react";

interface Props {
  onFile: (file: File) => void;
  error?: string | null;
}

export function Uploader({ onFile, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Paint it for real.</h1>
        <p className="mt-2 max-w-[34ch] text-neutral-500">
          Turn a photo into an oil-paint reference and the exact colors to mix by hand.
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
        className={`block w-full rounded-2xl border-2 border-dashed bg-white p-12 text-center shadow transition ${
          drag ? "border-[var(--accent,#c65d3b)] bg-amber-50" : "border-neutral-300"
        }`}
      >
        <div className="text-4xl">🖼️</div>
        <p className="mt-3 text-lg font-semibold">Add a photo</p>
        <p className="text-neutral-500">Tap to choose or take a picture</p>
        <span className="mt-3 block text-xs text-neutral-400">or drag &amp; drop it here</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />

      {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}

      <p className="mt-4 text-center text-xs text-neutral-500">
        Your photo never leaves your device — everything runs right here in your browser.
      </p>
    </div>
  );
}
