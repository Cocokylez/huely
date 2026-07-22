"use client";

import type { PaletteColor } from "@/lib/image/types";
import { luminance } from "@/lib/image/color";
import { useMixer } from "@/components/mixer/MixerProvider";
import { useToast } from "@/components/ui/ToastProvider";

interface Props {
  colors: PaletteColor[];
  done?: Set<number>;
  onToggleDone?: (index: number) => void;
  focus?: number | null;
  onFocus?: (index: number) => void;
}

/** Paint-chip grid — auto-fill minmax(96px,1fr), gap 12 (spec 02 · Paint chip). */
export function Palette({ colors, done, onToggleDone, focus, onFocus }: Props) {
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
        const isDone = !!done?.has(i);
        const isFocus = focus === i;
        return (
          <div
            key={`${hex}-${i}`}
            className={`relative flex flex-col overflow-hidden rounded-xl border shadow-[var(--shadow-sm)] transition ${
              isFocus
                ? "border-[var(--accent)] ring-2 ring-[var(--accent)]"
                : isDone
                  ? "border-[var(--accent-2)] opacity-70"
                  : "border-[var(--line)]"
            } bg-[var(--card-2)]`}
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
              {isDone && (
                <span className="absolute inset-0 grid place-items-center bg-black/15 text-[22px] font-bold text-white drop-shadow">
                  ✓
                </span>
              )}
              <span className="absolute bottom-1.5 right-[7px] rounded-md bg-black/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white opacity-0 transition-opacity group-hover:opacity-100">
                copy
              </span>
            </button>

            {onFocus && (
              <button
                onClick={() => onFocus(i)}
                aria-pressed={isFocus}
                title={isFocus ? "Show all colors" : "Paint just this color"}
                className={`absolute right-[7px] top-[7px] grid h-[22px] w-[22px] place-items-center rounded-full border text-[11px] transition ${
                  isFocus
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-white/60 bg-black/25 text-white hover:bg-[var(--accent)]"
                }`}
              >
                ◎
              </button>
            )}

            <div className="px-2 pb-1.5 pt-2">
              <b className="block text-[12px]" style={{ fontFamily: "var(--mono)" }}>
                {hex}
              </b>
              <small className="text-[10px] text-[var(--ink-soft)]">
                rgb({c.r}, {c.g}, {c.b})
              </small>
            </div>
            <div className="flex border-t border-[var(--line)]">
              <button
                onClick={() => addColor(c.hex)}
                className="flex-1 py-1.5 text-[11px] font-bold text-[var(--ink-soft)] transition hover:bg-[var(--paper-2)] hover:text-[var(--accent)]"
              >
                + Mixer
              </button>
              {onToggleDone && (
                <button
                  onClick={() => onToggleDone(i)}
                  aria-pressed={isDone}
                  title={isDone ? "Mark not done" : "Mark done"}
                  className={`grid w-9 place-items-center border-l border-[var(--line)] text-[13px] font-bold transition ${
                    isDone
                      ? "bg-[var(--accent-2)] text-white"
                      : "text-[var(--ink-soft)] hover:bg-[var(--paper-2)] hover:text-[var(--accent-2)]"
                  }`}
                >
                  ✓
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
