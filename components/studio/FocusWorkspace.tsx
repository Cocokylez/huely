"use client";

import { useEffect, useState } from "react";
import type { PipelineResult, ViewMode } from "@/lib/image/types";
import { nearestName } from "@/lib/image/colorNames";
import { useMixer } from "@/components/mixer/MixerProvider";
import { ImageCanvas } from "./ImageCanvas";
import { Palette } from "./Palette";
import { PaintingSteps } from "./PaintingSteps";

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

const VIEWS: [ViewMode, string][] = [
  ["oil", "Oil"],
  ["original", "Orig"],
  ["pbn", "Nums"],
];

/**
 * Full-screen painting workspace: the reference gets the screen (centered, big
 * and clear), tools + zoom on the image. The palette / views / mixer live in a
 * side panel on desktop and a slide-up sheet on mobile so the image stays clear.
 */
export function FocusWorkspace(props: Props) {
  const { result, view, onView, onSample, done, onToggleDone, focusColor, onFocus, onExit } = props;
  const { openMixer } = useMixer();
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<"colors" | "steps">("colors");

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

  const iconBtn =
    "grid h-9 w-9 flex-none place-items-center rounded-full border border-[var(--line)] bg-[var(--card)] text-[var(--ink-soft)] hover:border-[var(--accent)] hover:text-[var(--accent)]";

  const panelContent = (
    <>
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
            onClick={props.onDoneNext}
            className="flex-none rounded-full bg-[var(--accent-2)] px-2.5 py-1.5 text-[11px] font-semibold text-white active:scale-95"
          >
            Done · next
          </button>
          <button
            onClick={props.onClearFocus}
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

      <div className="mb-3 flex gap-0.5 rounded-full bg-[var(--paper-2)] p-[3px]">
        {(["colors", "steps"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setPanelTab(t)}
            className={`flex-1 rounded-full py-1.5 text-[12px] font-semibold capitalize transition ${
              panelTab === t
                ? "bg-[var(--card-2)] text-[var(--ink)] shadow-[var(--shadow-sm)]"
                : "text-[var(--ink-soft)]"
            }`}
          >
            {t === "colors" ? "Colors" : "Steps"}
          </button>
        ))}
      </div>

      {panelTab === "colors" ? (
        <Palette
          colors={result.palette}
          done={done}
          onToggleDone={onToggleDone}
          focus={focusColor}
          onFocus={onFocus}
        />
      ) : (
        <PaintingSteps
          palette={result.palette}
          index={result.index}
          done={done}
          onToggleDone={onToggleDone}
          focus={focusColor}
          onFocus={onFocus}
        />
      )}
    </>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--paper)]">
      {/* Slim top bar */}
      <div className="flex items-center gap-2 border-b border-[var(--line)] px-2.5 py-2">
        <button onClick={onExit} title="Exit focus (Esc)" className={iconBtn}>
          ✕
        </button>
        <div className="mx-auto flex gap-0.5 rounded-full bg-[var(--paper-2)] p-[3px]">
          {VIEWS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => onView(id)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                view === id
                  ? "bg-[var(--card-2)] text-[var(--ink)] shadow-[var(--shadow-sm)]"
                  : "text-[var(--ink-soft)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button onClick={openMixer} title="Color mixer" className={iconBtn}>
          🎨
        </button>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 md:flex-row">
        {/* Stage — reference centered, big and clear */}
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-2 md:p-5">
          <div
            className="w-full"
            style={{ maxWidth: `min(100%, calc((100dvh - 132px) * ${result.w} / ${result.h}))` }}
          >
            <ImageCanvas result={result} view={view} onSample={onSample} done={done} focus={focusColor} />
          </div>
        </div>

        {/* Desktop: side panel */}
        <aside className="hidden overflow-y-auto border-l border-[var(--line)] p-4 md:block md:w-[320px]">
          {panelContent}
        </aside>
      </div>

      {/* Mobile: backdrop + slide-up sheet */}
      {panelOpen && (
        <div className="fixed inset-0 z-[55] bg-black/30 md:hidden" onClick={() => setPanelOpen(false)} aria-hidden />
      )}
      <div
        className="fixed inset-x-0 bottom-0 z-[56] overflow-y-auto rounded-t-2xl border-t border-[var(--line)] bg-[var(--paper)] p-4 shadow-[0_-12px_40px_rgba(0,0,0,0.25)] md:hidden"
        style={{
          maxHeight: "72vh",
          transform: panelOpen ? "translateY(0)" : "translateY(101%)",
          transition: "transform 0.28s cubic-bezier(0.2,0.8,0.2,1)",
        }}
      >
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-[var(--line)]" aria-hidden />
        {panelContent}
      </div>

      {/* Mobile: floating button to open the palette sheet */}
      {!panelOpen && (
        <button
          onClick={() => setPanelOpen(true)}
          className="fixed bottom-4 left-1/2 z-[54] -translate-x-1/2 rounded-full border border-[var(--line)] bg-[var(--card-2)] px-4 py-2.5 text-[13px] font-semibold shadow-[var(--shadow)] active:scale-95 md:hidden"
        >
          🎨 Colors{doneCount > 0 ? ` · ${doneCount}/${total}` : ""}
        </button>
      )}
    </div>
  );
}
