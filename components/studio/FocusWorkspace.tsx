"use client";

import { useEffect, useState } from "react";
import type { PipelineResult, ViewMode } from "@/lib/image/types";
import { nearestName } from "@/lib/image/colorNames";
import { useMixer } from "@/components/mixer/MixerProvider";
import { ImageCanvas } from "./ImageCanvas";
import { Palette } from "./Palette";
import { PaintingSteps } from "./PaintingSteps";
import { WorkspaceTools, useWorkspaceTools } from "./WorkspaceView";

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

const VIEWS: { id: ViewMode; label: string; short: string }[] = [
  { id: "oil", label: "Oil paint", short: "Oil" },
  { id: "original", label: "Original", short: "Original" },
  { id: "pbn", label: "By numbers", short: "Numbers" },
];

type MobileSheet = "views" | "tools" | "colors" | null;

/**
 * Full-screen painting workspace: the reference gets the screen (centered, big
 * and clear), tools + zoom on the image. The palette / views / mixer live in a
 * side panel on desktop and one shared tool dock on mobile so the image stays clear.
 */
export function FocusWorkspace(props: Props) {
  const { result, view, onView, onSample, done, onToggleDone, focusColor, onFocus, onExit } = props;
  const { open: mixerOpen, openMixer, setTarget } = useMixer();
  const workspaceTools = useWorkspaceTools();
  const [mobileSheet, setMobileSheet] = useState<MobileSheet>(null);
  const [panelTab, setPanelTab] = useState<"colors" | "steps">("colors");
  const [sampled, setSampled] = useState<string | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || mixerOpen) return;
      if (mobileSheet) setMobileSheet(null);
      else onExit();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [mixerOpen, mobileSheet, onExit]);

  const total = result.palette.length;
  const doneCount = [...done].filter((i) => i < total).length;
  const active = focusColor != null ? result.palette[focusColor] : null;

  const iconBtn =
    "grid h-9 w-9 flex-none place-items-center rounded-full border border-[var(--line)] bg-[var(--card)] text-[var(--ink-soft)] hover:border-[var(--accent)] hover:text-[var(--accent)]";

  const currentView = VIEWS.find((item) => item.id === view) ?? VIEWS[0];

  const toggleSheet = (sheet: Exclude<MobileSheet, null>) => {
    setMobileSheet((current) => (current === sheet ? null : sheet));
  };

  const sampleColor = (hex: string) => {
    setSampled(hex);
    onSample(hex);
  };

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
      {/* Minimal top bar; mobile controls live in the shared bottom dock. */}
      <div className="flex items-center gap-2 border-b border-[var(--line)] px-2.5 py-2">
        <button onClick={onExit} title="Exit focus (Esc)" aria-label="Exit workspace" className={iconBtn}>
          ✕
        </button>
        <div className="min-w-0 flex-1 text-center md:hidden">
          <b className="block text-[13px] leading-tight">Painting workspace</b>
          <span className="block text-[10px] text-[var(--ink-soft)]">{currentView.label}</span>
        </div>
        <div className="mx-auto hidden gap-0.5 rounded-full bg-[var(--paper-2)] p-[3px] md:flex">
          {VIEWS.map(({ id, short }) => (
            <button
              key={id}
              onClick={() => onView(id)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                view === id
                  ? "bg-[var(--card-2)] text-[var(--ink)] shadow-[var(--shadow-sm)]"
                  : "text-[var(--ink-soft)]"
              }`}
            >
              {short}
            </button>
          ))}
        </div>
        <span className="min-w-9 flex-none text-center text-[11px] font-semibold text-[var(--ink-soft)] md:hidden">
          {doneCount}/{total}
        </span>
        <button onClick={openMixer} title="Color mixer" aria-label="Open color mixer" className={`${iconBtn} hidden md:grid`}>
          🎨
        </button>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 md:flex-row">
        {/* Stage — reference centered, big and clear */}
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto overscroll-contain p-3 pb-20 md:p-5">
          <div
            className="w-full"
            style={{ maxWidth: `min(100%, calc((100dvh - 132px) * ${result.w} / ${result.h}))` }}
          >
            <ImageCanvas
              result={result}
              view={view}
              onSample={sampleColor}
              done={done}
              focus={focusColor}
              workspaceTools={workspaceTools}
              toolbar="desktop-only"
            />
          </div>
        </div>

        {/* Desktop: side panel */}
        <aside className="hidden overflow-y-auto border-l border-[var(--line)] p-4 md:block md:w-[320px]">
          {panelContent}
        </aside>
      </div>

      {sampled && !mobileSheet && !mixerOpen && (
        <div className="fixed bottom-[76px] left-1/2 z-[53] flex -translate-x-1/2 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--card-2)]/95 p-1.5 pl-2 shadow-[var(--shadow)] backdrop-blur md:bottom-4 md:left-4 md:translate-x-0">
          <span className="h-6 w-6 rounded-full border border-black/10" style={{ background: sampled }} />
          <b className="font-mono text-[11px]">{sampled}</b>
          <button
            type="button"
            onClick={() => {
              setTarget(sampled);
              openMixer();
            }}
            className="rounded-full bg-[var(--accent)] px-2.5 py-1.5 text-[10px] font-semibold text-white"
          >
            Mix it
          </button>
          <button
            type="button"
            onClick={() => setSampled(null)}
            aria-label="Dismiss sampled color"
            className="grid h-6 w-6 place-items-center rounded-full text-[11px] text-[var(--ink-soft)]"
          >
            ✕
          </button>
        </div>
      )}

      {/* Mobile: every secondary control uses the same compact sheet. */}
      {mobileSheet && (
        <>
          <button
            type="button"
            aria-label="Close workspace panel"
            className="fixed inset-0 z-[54] bg-black/30 md:hidden"
            onClick={() => setMobileSheet(null)}
          />
          <section
            role="dialog"
            aria-label={
              mobileSheet === "views"
                ? "Choose reference view"
                : mobileSheet === "tools"
                  ? "Artist tools"
                  : "Colors and painting steps"
            }
            className="fixed inset-x-2 bottom-[76px] z-[56] max-h-[62dvh] overflow-y-auto overscroll-contain rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-3.5 shadow-[0_-12px_40px_rgba(0,0,0,0.25)] md:hidden"
            style={{ animation: "sheet-up 0.24s cubic-bezier(0.2,0.8,0.2,1)" }}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-bold">
                {mobileSheet === "views"
                  ? "Reference view"
                  : mobileSheet === "tools"
                    ? "Artist tools"
                    : "Colors & steps"}
              </h2>
              <button
                type="button"
                onClick={() => setMobileSheet(null)}
                aria-label="Close panel"
                className="grid h-8 w-8 place-items-center rounded-full border border-[var(--line)] bg-[var(--card-2)] text-[var(--ink-soft)]"
              >
                ✕
              </button>
            </div>

            {mobileSheet === "views" && (
              <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Reference view">
                {VIEWS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={view === id}
                    onClick={() => {
                      onView(id);
                      setMobileSheet(null);
                    }}
                    className={`rounded-xl border px-2 py-3 text-[12px] font-semibold transition ${
                      view === id
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-[var(--line)] bg-[var(--card-2)] text-[var(--ink-soft)]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {mobileSheet === "tools" && (
              <>
                <WorkspaceTools tools={workspaceTools} layout="panel" />
                <p className="mt-3 text-[11px] leading-relaxed text-[var(--ink-soft)]">
                  Grid and guides stay aligned while you zoom. Value, adjustments, and flip only change your reference view.
                </p>
              </>
            )}

            {mobileSheet === "colors" && panelContent}
          </section>
        </>
      )}

      {/* Mobile: one predictable dock replaces scattered controls. */}
      <nav
        aria-label="Workspace tools"
        className="fixed bottom-2 left-1/2 z-[57] grid w-[calc(100%_-_1rem)] max-w-sm -translate-x-1/2 grid-cols-4 gap-1 rounded-2xl border border-[var(--line)] bg-[var(--card-2)]/95 p-1.5 shadow-[var(--shadow)] backdrop-blur md:hidden"
      >
        <button
          type="button"
          onClick={() => toggleSheet("views")}
          aria-pressed={mobileSheet === "views"}
          className={`flex min-w-0 flex-col items-center rounded-xl px-1 py-1.5 text-[10px] font-semibold ${
            mobileSheet === "views" ? "bg-[var(--paper-2)] text-[var(--accent)]" : "text-[var(--ink-soft)]"
          }`}
        >
          <span className="text-[13px] font-bold text-[var(--ink)]">{currentView.short}</span>
          View
        </button>
        <button
          type="button"
          onClick={() => toggleSheet("tools")}
          aria-pressed={mobileSheet === "tools"}
          className={`flex flex-col items-center rounded-xl px-1 py-1.5 text-[10px] font-semibold ${
            mobileSheet === "tools" ? "bg-[var(--paper-2)] text-[var(--accent)]" : "text-[var(--ink-soft)]"
          }`}
        >
          <span className="text-[16px] leading-[17px] text-[var(--ink)]" aria-hidden>⊞</span>
          Tools
        </button>
        <button
          type="button"
          onClick={() => toggleSheet("colors")}
          aria-pressed={mobileSheet === "colors"}
          className={`relative flex flex-col items-center rounded-xl px-1 py-1.5 text-[10px] font-semibold ${
            mobileSheet === "colors" ? "bg-[var(--paper-2)] text-[var(--accent)]" : "text-[var(--ink-soft)]"
          }`}
        >
          <span className="flex h-[17px] items-center gap-0.5" aria-hidden>
            {result.palette.slice(0, 3).map((color, index) => (
              <span key={`${color.hex}-${index}`} className="h-3 w-3 rounded-full border border-black/10" style={{ background: color.hex }} />
            ))}
          </span>
          Colors
          {doneCount > 0 && (
            <span className="absolute right-1 top-0 rounded-full bg-[var(--accent-2)] px-1 text-[8px] leading-3 text-white">
              {doneCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setMobileSheet(null);
            openMixer();
          }}
          className="flex flex-col items-center rounded-xl px-1 py-1.5 text-[10px] font-semibold text-[var(--ink-soft)]"
        >
          <span
            className="h-[17px] w-[17px] rounded-full border border-black/10"
            style={{ background: "conic-gradient(#c65d3b,#e0b64f,#2f6f6a,#5a8f4e,#c65d3b)" }}
            aria-hidden
          />
          Mixer
        </button>
      </nav>
    </div>
  );
}
