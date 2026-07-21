"use client";

import type { PaletteColor } from "@/lib/image/types";
import { luminance } from "@/lib/image/color";
import { useMixer } from "@/components/mixer/MixerProvider";
import { useToast } from "@/components/ui/ToastProvider";

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
            className="flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm"
          >
            <button
              onClick={() => copy(hex)}
              title={`Copy ${hex}`}
              className="relative h-16 w-full"
              style={{ background: c.hex }}
            >
              <span
                className="absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full text-[0.72rem] font-bold"
                style={{
                  background: dark ? "rgba(45,39,35,0.85)" : "rgba(255,255,255,0.9)",
                  color: dark ? "#fff" : "#2d2723",
                }}
              >
                {i + 1}
              </span>
            </button>
            <div className="px-2 pb-1 pt-2">
              <b className="block font-mono text-[0.82rem]">{hex}</b>
              <small className="text-[0.66rem] text-neutral-500">
                rgb({c.r}, {c.g}, {c.b})
              </small>
            </div>
            <button
              onClick={() => addColor(c.hex)}
              className="border-t border-neutral-200 py-1.5 text-[0.72rem] font-bold text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
            >
              + Mixer
            </button>
          </div>
        );
      })}
    </div>
  );
}
