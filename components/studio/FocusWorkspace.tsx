"use client";

import { useEffect } from "react";
import type { PipelineResult, ViewMode } from "@/lib/image/types";
import { nearestName } from "@/lib/image/colorNames";
import { useMixer } from "@/components/mixer/MixerProvider";
import { ViewSwitcher } from "./ViewSwitcher";
import { ImageCanvas } from "./ImageCanvas";
import { Palette } from "./Palette";

interface Props {
  result: PipelineResult;
  view: ViewMode;
  onView: (v: ViewMode) => void;
  onSample: (hex: string) => void;
  done: Set<number>;
  onToggleDone: (i: number) => void;
  focusColor: number | null;
  onFocus: (i: number) => void;
  onDoneNext: () => void;
  onClearFocus: () => void;
  onExit: () => void;
}

/**
 * Full-screen painting workspace: the reference floats centered with empty
 * space around it (zoom/pan + all tools), and the palette / views / mixer sit
 * alongside — a side panel on desktop, a bottom panel on mobile.
 */
export function FocusWorkspace({
  result,
  view,
  onView,
  onSample,
  done,
  onToggleDone,
  focusColor,
  onFocus,
  onDoneNext,
  onClearFocus,
  onExit,
}: Props) {
  const { openMixer } = useMixer();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onExit]);

  const total = result.palette.length;
  const doneCount = [...done].filter((i) => i < total).length;
  const active = focusColor != null ? result.palette[focusColor] : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--paper)]">
      <div className="flex items-center gap-2 border-b border-[var(--line)] px-3 py-2">
        <button
          onClick={onExit}
          title="Exit focus (Esc)"
          className="grid h-9 w-9 flex-none place-items-center rounded-full border border-[var(--line)] bg-[var(--card)] text-[var(--ink-soft)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          ✕
        </button>
        <div className="mx-auto w-full max-w-[380px]">
          <ViewSwitcher view={view} onChange={onView} />
        </div>
        <button
          onClick={openMixer}
          className="flex-none rounded-full border border-[var(--line)] bg-[var(--card)] px-3.5 py-2 text-[13px] font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          🎨 Mixer
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Stage — reference centered, empty space around it */}
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-3 md:p-6">
          <div
            className="w-full"
            style={{ maxWidth: `min(100%, calc((100dvh - 210px) * ${result.w} / ${result.h}))` }}
          >
            <ImageCanvas result={result} view={view} onSample={onSample} done={done} focus={focusColor} />
          </div>
        </div>

        {/* Panel — palette, progress, now-painting */}
        <aside className="max-h-[42vh] overflow-y-auto border-t border-[var(--line)] p-4 md:max-h-none md:w-[340px] md:border-l md:border-t-0">
          {active && (
            <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_7%,var(--card))] p-2.5">
              <span
                className="grid h-8 w-8 flex-none place-items-center rounded-lg text-[12px] font-bold text-white"
                style={{ background: active.hex }}
              >
                {focusColor! + 1}
              </span>
              <div className="min-w-0 flex-1 text-[12px] leading-tight">
                <b>{nearestName(active.r, active.g, active.b)}</b>
                <span className="block text-[var(--ink-soft)]" style={{ fontFamily: "var(--mono)" }}>
                  {active.hex.toUpperCase()}
                </span>
              </div>
              <button
                onClick={onDoneNext}
                className="flex-none rounded-full bg-[var(--accent-2)] px-2.5 py-1.5 text-[11px] font-semibold text-white active:scale-95"
              >
                Done · next
              </button>
              <button
                onClick={onClearFocus}
                className="flex-none rounded-full border border-[var(--line)] bg-[var(--card-2)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--ink-soft)]"
              >
                All
              </button>
            </div>
          )}

          <div className="mb-3 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--paper-2)]">
              <div
                className="h-full rounded-full bg-[var(--accent-2)] transition-all"
                style={{ width: `${total ? (doneCount / total) * 100 : 0}%` }}
              />
            </div>
            <span className="flex-none text-[12px] font-semibold text-[var(--ink-soft)]">
              {doneCount === total && total > 0 ? "All done 🎉" : `${doneCount}/${total}`}
            </span>
          </div>

          <Palette
            colors={result.palette}
            done={done}
            onToggleDone={onToggleDone}
            focus={focusColor}
            onFocus={onFocus}
          />
        </aside>
      </div>
    </div>
  );
}
