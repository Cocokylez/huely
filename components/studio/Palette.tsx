"use client";

import type { PaletteColor } from "@/lib/image/types";
import { luminance } from "@/lib/image/color";
import { useMixer } from "@/components/mixer/MixerProvider";
import { useToast } from "@/components/ui/ToastProvider";

/** Paint-chip grid — auto-fill minmax(96px,1fr), gap 12 (spec 02 · Paint chip). */
export function Palette({ colors }: { colors: PaletteColor[] }) {
  const { addColor } = useMixer();
  const { toast } = useToast();

  const copy = (hex: string) => {
    navigator.clipboard?.writeText(hex);
    toast(`Copied ${hex}`);
  };

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-3">
      {colors.map((c, i) => {
        const hex = c.hex.toUpperCase();
        const dark = luminance(c) > 140;
        return (
          <div
            key={`${hex}-${i}`}
            className="flex flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--card-2)] shadow-[var(--shadow-sm)]"
          >
            <button
              onClick={() => copy(hex)}
              title={`Copy ${hex}`}
              className="group relative h-[66px] w-full"
              style={{ background: c.hex }}
            >
              <span
                className="absolute left-[7px] top-[7px] grid h-[21px] w-[21px] place-items-center rounded-full text-[11px] font-bold"
                style={{
                  background: dark ? "rgba(45,39,35,0.85)" : "rgba(255,255,255,0.9)",
                  color: dark ? "#fff" : "#2d2723",
                }}
              >
                {i + 1}
              </span>
              <span className="absolute bottom-1.5 right-[7px] rounded-md bg-black/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white opacity-0 transition-opacity group-hover:opacity-100">
                copy
              </span>
            </button>
            <div className="px-2 pb-1.5 pt-2">
              <b className="block text-[12px]" style={{ fontFamily: "var(--mono)" }}>
                {hex}
              </b>
              <small className="text-[10px] text-[var(--ink-soft)]">
                rgb({c.r}, {c.g}, {c.b})
              </small>
            </div>
            <button
              onClick={() => addColor(c.hex)}
              className="border-t border-[var(--line)] py-1.5 text-[11px] font-bold text-[var(--ink-soft)] transition hover:bg-[var(--paper-2)] hover:text-[var(--accent)]"
            >
              + Mixer
            </button>
          </div>
        );
      })}
    </div>
  );
}
