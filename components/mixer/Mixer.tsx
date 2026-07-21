"use client";

import { useEffect } from "react";
import { useMixer } from "./MixerProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { nearestName } from "@/lib/image/colorNames";
import { hexToRgb } from "@/lib/image/color";

export function Mixer() {
  const { slots, open, result, closeMixer, removeSlot, setHex, setParts, addColor, clear } =
    useMixer();
  const { toast } = useToast();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) closeMixer();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closeMixer]);

  if (!open) return null;

  const copyResult = () => {
    if (!result) return;
    navigator.clipboard?.writeText(result.hex);
    toast(`Copied ${result.hex}`);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={closeMixer} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Color mixer"
        className="relative flex max-h-[90dvh] w-full max-w-xl flex-col gap-4 overflow-y-auto rounded-t-3xl bg-[var(--paper)] p-5 pb-8 shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">Color Mixer</h2>
            <p className="text-sm text-neutral-500">Blend colors like paint, and name any shade.</p>
          </div>
          <button
            onClick={closeMixer}
            aria-label="Close"
            className="h-9 w-9 rounded-full border border-neutral-300 text-neutral-600 hover:border-neutral-500"
          >
            ✕
          </button>
        </div>

        {/* Result */}
        <div className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white/60 p-4">
          <div
            className="h-16 w-16 flex-none rounded-xl border border-black/10"
            style={{ background: result?.hex ?? "var(--paper-2, #ece4d6)" }}
          />
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{result?.name ?? "Add colors to mix"}</div>
            <div className="font-mono text-sm text-neutral-500">{result?.hex ?? "—"}</div>
            <div className="text-xs text-neutral-500">
              {result ? `rgb(${result.rgb[0]}, ${result.rgb[1]}, ${result.rgb[2]})` : "rgb(—)"}
            </div>
          </div>
          <button
            onClick={copyResult}
            disabled={!result}
            className="rounded-full border border-neutral-300 px-3 py-2 text-sm font-semibold disabled:opacity-40"
          >
            Copy
          </button>
        </div>

        {/* Slots */}
        <div className="flex flex-col gap-2">
          {slots.map((s, i) => {
            const [r, g, b] = hexToRgb(s.hex);
            return (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white/60 p-2.5"
              >
                <label className="relative h-10 w-10 flex-none cursor-pointer">
                  <span
                    className="block h-full w-full rounded-lg border border-black/10"
                    style={{ background: s.hex }}
                  />
                  <input
                    type="color"
                    value={s.hex}
                    onChange={(e) => setHex(i, e.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                </label>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-sm">{s.hex.toUpperCase()}</div>
                  <div className="text-xs text-neutral-500">{nearestName(r, g, b)}</div>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-neutral-100 p-1">
                  <button
                    onClick={() => setParts(i, s.parts - 1)}
                    aria-label="Fewer parts"
                    className="h-6 w-6 rounded-full text-lg leading-none hover:bg-white"
                  >
                    −
                  </button>
                  <span className="w-5 text-center text-sm font-bold">{s.parts}</span>
                  <button
                    onClick={() => setParts(i, s.parts + 1)}
                    aria-label="More parts"
                    className="h-6 w-6 rounded-full text-lg leading-none hover:bg-white"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => removeSlot(i)}
                  aria-label="Remove color"
                  className="h-6 w-6 flex-none rounded-full text-neutral-500 hover:text-neutral-800"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => addColor(slots[0]?.hex ?? "#7f7f7f")}
            className="flex-1 rounded-xl border border-neutral-300 px-4 py-3 text-sm font-semibold hover:border-neutral-500"
          >
            + Add a color
          </button>
          <button
            onClick={clear}
            className="flex-1 rounded-xl border border-neutral-300 px-4 py-3 text-sm font-semibold hover:border-neutral-500"
          >
            Clear
          </button>
        </div>

        <p className="text-xs leading-relaxed text-neutral-500">
          Mixing is subtractive, like real pigment — blue + yellow makes green. Use − / + to change
          how many parts of each color go in.
        </p>
      </div>
    </div>
  );
}
