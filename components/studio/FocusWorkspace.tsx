"use client";

import { useEffect, useState } from "react";
import type { PipelineResult, ViewMode } from "@/lib/image/types";
import { formatCanvasSize, type CanvasSpec } from "@/lib/canvas/spec";
import { nearestName } from "@/lib/image/colorNames";
import {
  patchProjectWorkspace,
  readProjectWorkspace,
  type WorkspacePanel,
} from "@/lib/history/workspace";
import { useMixer } from "@/components/mixer/MixerProvider";
import { Icon } from "@/components/ui/Icon";
import { ImageCanvas } from "./ImageCanvas";
import { Palette } from "./Palette";
import { PaintingSteps } from "./PaintingSteps";
import { CanvasShot } from "./CanvasShot";
import { WorkspaceTools, useWorkspaceTools } from "./WorkspaceView";

interface Props {
  projectId: string | null;
  canvas?: CanvasSpec | null;
  result: PipelineResult;
  view: ViewMode;
  onView: (v: ViewMode) => void;
  onSample: (hex: string) => void;
  done: Set<number>;
  onToggleDone: (i: number) => void;
  focusColor: number | null;
  onFocus: (i: number) => void;
  onRestoreFocus: (i: number | null) => void;
  onDoneNext: () => void;
  onClearFocus: () => void;
  onExit: () => void;
}

type WorkspaceViewChoice = ViewMode | "value";

const VIEWS: { id: WorkspaceViewChoice; label: string; short: string; icon: "brush" | "image" | "hash" | "value" }[] = [
  { id: "oil", label: "Oil paint", short: "Oil", icon: "brush" },
  { id: "original", label: "Original", short: "Original", icon: "image" },
  { id: "pbn", label: "By numbers", short: "Numbers", icon: "hash" },
  { id: "value", label: "Value study", short: "Value", icon: "value" },
];

type MobileSheet = "views" | "transfer" | "analyze" | "paint" | "compare" | null;

/**
 * Full-screen painting workspace: the reference gets the screen (centered, big
 * and clear), tools + zoom on the image. The palette / views / mixer live in a
 * side panel on desktop and one shared tool dock on mobile so the image stays clear.
 */
export function FocusWorkspace(props: Props) {
  const {
    projectId,
    canvas,
    result,
    view,
    onView,
    onSample,
    done,
    onToggleDone,
    focusColor,
    onFocus,
    onRestoreFocus,
    onExit,
  } = props;
  const { open: mixerOpen, openMixer, setTarget } = useMixer();
  const workspaceTools = useWorkspaceTools();
  const [mobileSheet, setMobileSheet] = useState<MobileSheet>(null);
  const [panelTab, setPanelTab] = useState<WorkspacePanel>("colors");
  const [sampled, setSampled] = useState<string | null>(null);
  const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setLoadedProjectId(null);
      return;
    }

    const saved = readProjectWorkspace(projectId)?.settings;
    if (saved) {
      const adjustment = (value: unknown) => {
        const number = Number(value);
        return Number.isFinite(number) ? Math.min(200, Math.max(0, number)) : 100;
      };
      if (["oil", "original", "pbn"].includes(saved.view)) onView(saved.view);
      workspaceTools.setGridN([0, 3, 4, 6, 8].includes(saved.gridN) ? saved.gridN : 0);
      workspaceTools.setGuides(Number.isInteger(saved.guides) ? Math.min(3, Math.max(0, saved.guides)) : 0);
      workspaceTools.setGray(Boolean(saved.gray));
      workspaceTools.setFlip(Boolean(saved.flip));
      workspaceTools.setAdj({
        b: adjustment(saved.adjustments?.b),
        c: adjustment(saved.adjustments?.c),
        s: adjustment(saved.adjustments?.s),
      });
      const restoredFocus =
        saved.focusColor != null && saved.focusColor >= 0 && saved.focusColor < result.palette.length
          ? saved.focusColor
          : null;
      onRestoreFocus(restoredFocus);
      setPanelTab(["colors", "steps", "compare"].includes(saved.panel) ? saved.panel : "colors");
    }
    setLoadedProjectId(projectId);
    // Restore once when a project enters the workspace; live changes are saved below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!projectId || loadedProjectId !== projectId) return;
    patchProjectWorkspace(projectId, {
      settings: {
        view,
        gridN: workspaceTools.gridN,
        guides: workspaceTools.guides,
        gray: workspaceTools.gray,
        flip: workspaceTools.flip,
        adjustments: workspaceTools.adj,
        focusColor,
        panel: panelTab,
      },
    });
  }, [
    projectId,
    loadedProjectId,
    view,
    workspaceTools.gridN,
    workspaceTools.guides,
    workspaceTools.gray,
    workspaceTools.flip,
    workspaceTools.adj,
    focusColor,
    panelTab,
  ]);

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
  const displayWidth = view === "original" ? result.original.width : result.w;
  const displayHeight = view === "original" ? result.original.height : result.h;

  const iconBtn =
    "grid h-9 w-9 flex-none place-items-center rounded-full border border-[var(--line)] bg-[var(--card)] text-[var(--ink-soft)] hover:border-[var(--accent)] hover:text-[var(--accent)]";
  const dockButton = (active: boolean) =>
    `relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[9px] font-semibold ${
      active ? "bg-[var(--paper-2)] text-[var(--accent)]" : "text-[var(--ink-soft)]"
    }`;

  const currentView = workspaceTools.gray
    ? VIEWS.find((item) => item.id === "value")!
    : (VIEWS.find((item) => item.id === view) ?? VIEWS[0]);

  const chooseView = (choice: WorkspaceViewChoice) => {
    if (choice === "value") {
      workspaceTools.setGray(true);
      return;
    }
    workspaceTools.setGray(false);
    onView(choice);
  };

  const viewIsActive = (choice: WorkspaceViewChoice) =>
    choice === "value" ? workspaceTools.gray : !workspaceTools.gray && view === choice;

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
            type="button"
            onClick={props.onDoneNext}
            className="flex-none rounded-full bg-[var(--accent-2)] px-2.5 py-1.5 text-[11px] font-semibold text-white active:scale-95"
          >
            Done · next
          </button>
          <button
            type="button"
            onClick={props.onClearFocus}
            className="flex-none rounded-full border border-[var(--line)] bg-[var(--card-2)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--ink-soft)]"
          >
            All
          </button>
        </div>
      )}

      <div className="mb-3 flex items-center gap-3">
        <div
          role="progressbar"
          aria-label="Painting colors completed"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={doneCount}
          aria-valuetext={`${doneCount} of ${total} colors done`}
          className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--paper-2)]"
        >
          <div
            className="h-full rounded-full bg-[var(--accent-2)] transition-all"
            style={{ width: `${total ? (doneCount / total) * 100 : 0}%` }}
          />
        </div>
        <span className="flex-none text-[12px] font-semibold text-[var(--ink-soft)]">
          {doneCount === total && total > 0 ? "Complete" : `${doneCount}/${total}`}
        </span>
      </div>

      <div
        role="group"
        aria-label="Project panel"
        className="mb-3 flex gap-0.5 rounded-full bg-[var(--paper-2)] p-[3px]"
      >
        {(["colors", "steps", "compare"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setPanelTab(t)}
            aria-pressed={panelTab === t}
            className={`flex-1 rounded-full py-1.5 text-[12px] font-semibold capitalize transition ${
              panelTab === t
                ? "bg-[var(--card-2)] text-[var(--ink)] shadow-[var(--shadow-sm)]"
                : "text-[var(--ink-soft)]"
            }`}
          >
            {t === "colors" ? "Colors" : t === "steps" ? "Steps" : "Compare"}
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
      ) : panelTab === "steps" ? (
        <PaintingSteps
          palette={result.palette}
          index={result.index}
          done={done}
          onToggleDone={onToggleDone}
          focus={focusColor}
          onFocus={onFocus}
        />
      ) : (
        <CanvasShot projectId={projectId} result={result} />
      )}

      {panelTab !== "compare" && (
        <button
          type="button"
          onClick={() => {
            setMobileSheet(null);
            openMixer();
          }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--card-2)] px-3 py-2.5 text-[11px] font-semibold text-[var(--ink-soft)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          <Icon name="palette" size={15} /> Open Paint Lab
        </button>
      )}
    </>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Painting workspace"
      className="fixed inset-0 z-50 flex flex-col bg-[var(--paper)]"
    >
      {/* Minimal top bar; mobile controls live in the shared bottom dock. */}
      <div className="flex items-center gap-2 border-b border-[var(--line)] px-2.5 py-2">
        <button type="button" autoFocus onClick={onExit} title="Exit focus (Esc)" aria-label="Exit workspace" className={iconBtn}>
          <Icon name="x" size={17} />
        </button>
        <div className="min-w-0 flex-1 text-center md:hidden">
          <b className="block text-[13px] leading-tight">Painting workspace</b>
          <span className="block text-[10px] text-[var(--ink-soft)]">
            {currentView.label} · {canvas ? formatCanvasSize(canvas) : `${displayWidth}×${displayHeight}`}
          </span>
        </div>
        <div
          role="group"
          aria-label="Reference view"
          className="mx-auto hidden gap-0.5 rounded-full bg-[var(--paper-2)] p-[3px] md:flex"
        >
          {VIEWS.map(({ id, short }) => (
            <button
              key={id}
              type="button"
              onClick={() => chooseView(id)}
              aria-pressed={viewIsActive(id)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                viewIsActive(id)
                  ? "bg-[var(--card-2)] text-[var(--ink)] shadow-[var(--shadow-sm)]"
                  : "text-[var(--ink-soft)]"
              }`}
            >
              {short}
            </button>
          ))}
        </div>
        {canvas && (
          <span className="hidden flex-none rounded-full border border-[var(--line)] bg-[var(--card)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--ink-soft)] md:block">
            {formatCanvasSize(canvas)}
          </span>
        )}
        <span className="min-w-9 flex-none text-center text-[11px] font-semibold text-[var(--ink-soft)] md:hidden">
          {doneCount}/{total}
        </span>
        <button type="button" onClick={openMixer} title="Color mixer" aria-label="Open color mixer" className={`${iconBtn} hidden md:grid`}>
          <Icon name="palette" size={17} />
        </button>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 md:flex-row">
        <aside className="relative hidden w-[78px] flex-none flex-col items-center border-r border-[var(--line)] bg-[var(--card)]/55 px-2 py-3 md:flex">
          <span className="mb-2 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]">
            Tools
          </span>
          <WorkspaceTools tools={workspaceTools} layout="rail" />
        </aside>

        {/* Stage — reference centered, big and clear */}
        <div
          className="flex min-h-0 flex-1 items-center justify-center overflow-auto overscroll-contain p-3 pb-20 md:p-6"
          style={{ background: "color-mix(in srgb, var(--paper-2) 58%, var(--paper))" }}
        >
          <div
            className="w-full"
            style={{ maxWidth: `min(100%, calc((100dvh - 132px) * ${displayWidth} / ${displayHeight}))` }}
          >
            <div className="rounded-[20px] border border-[var(--line)] bg-[var(--card-2)] p-2 shadow-[0_16px_42px_rgba(43,39,35,0.14)]">
              <ImageCanvas
                result={result}
                canvas={canvas}
                view={view}
                onSample={sampleColor}
                done={done}
                focus={focusColor}
                workspaceTools={workspaceTools}
                toolbar="hidden"
                workspaceId={projectId}
                immersive
              />
            </div>
          </div>
        </div>

        {/* Desktop: side panel */}
        <aside className="hidden overflow-y-auto border-l border-[var(--line)] bg-[var(--paper)] p-4 md:block md:w-[340px]">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]">
            Project tools
          </p>
          {panelContent}
        </aside>
      </div>

      {sampled && !mobileSheet && !mixerOpen && (
        <div role="status" className="fixed bottom-[76px] left-1/2 z-[53] flex -translate-x-1/2 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--card-2)]/95 p-1.5 pl-2 shadow-[var(--shadow)] backdrop-blur md:bottom-4 md:left-[94px] md:translate-x-0">
          <span aria-hidden className="h-6 w-6 rounded-full border border-black/10" style={{ background: sampled }} />
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
            <Icon name="x" size={14} />
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
            aria-modal="true"
            aria-label={
              mobileSheet === "views"
                ? "Choose reference view"
                : mobileSheet === "transfer"
                  ? "Transfer tools"
                  : mobileSheet === "analyze"
                    ? "Image analysis tools"
                    : mobileSheet === "compare"
                      ? "Compare reference and canvas"
                      : "Paint colors and steps"
            }
            className={`fixed inset-x-2 z-[56] overflow-y-auto overscroll-contain rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-3.5 shadow-[0_-12px_40px_rgba(0,0,0,0.25)] md:hidden ${
              mobileSheet === "compare" ? "max-h-[78dvh]" : "max-h-[62dvh]"
            }`}
            style={{
              bottom: "calc(4.75rem + env(safe-area-inset-bottom))",
              animation: "sheet-up 0.24s cubic-bezier(0.2,0.8,0.2,1)",
            }}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-bold">
                {mobileSheet === "views"
                  ? "Reference view"
                  : mobileSheet === "transfer"
                    ? "Transfer"
                    : mobileSheet === "analyze"
                      ? "Analyze"
                      : mobileSheet === "compare"
                        ? "Compare"
                        : "Paint"}
              </h2>
              <button
                type="button"
                onClick={() => setMobileSheet(null)}
                aria-label="Close panel"
                className="grid h-8 w-8 place-items-center rounded-full border border-[var(--line)] bg-[var(--card-2)] text-[var(--ink-soft)]"
              >
                <Icon name="x" size={15} />
              </button>
            </div>

            {mobileSheet === "views" && (
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="Reference view">
                {VIEWS.map(({ id, label, icon }) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={viewIsActive(id)}
                    onClick={() => {
                      chooseView(id);
                      setMobileSheet(null);
                    }}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-[12px] font-semibold transition ${
                      viewIsActive(id)
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-[var(--line)] bg-[var(--card-2)] text-[var(--ink-soft)]"
                    }`}
                  >
                    <Icon name={icon} size={17} />
                    {label}
                  </button>
                ))}
              </div>
            )}

            {mobileSheet === "transfer" && (
              <>
                <WorkspaceTools tools={workspaceTools} layout="panel" group="transfer" />
                <p className="mt-3 text-[11px] leading-relaxed text-[var(--ink-soft)]">
                  Grid and guides stay locked to the reference while you zoom. Flip helps you spot drawing errors with fresh eyes.
                </p>
              </>
            )}

            {mobileSheet === "analyze" && (
              <>
                <WorkspaceTools tools={workspaceTools} layout="panel" group="analyze" />
                <p className="mt-3 text-[11px] leading-relaxed text-[var(--ink-soft)]">
                  Use Value to judge light and dark. Tap the reference with the eyedropper to identify an exact color.
                </p>
              </>
            )}

            {mobileSheet === "paint" && panelContent}

            {mobileSheet === "compare" && <CanvasShot projectId={projectId} result={result} />}
          </section>
        </>
      )}

      {/* Mobile: one predictable dock replaces scattered controls. */}
      <nav
        aria-label="Workspace tools"
        className="fixed left-1/2 z-[57] grid w-[calc(100%_-_1rem)] max-w-md -translate-x-1/2 grid-cols-5 gap-1 rounded-2xl border border-[var(--line)] bg-[var(--card-2)]/95 p-1.5 shadow-[var(--shadow)] backdrop-blur md:hidden"
        style={{ bottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={() => toggleSheet("views")}
          aria-pressed={mobileSheet === "views"}
          className={dockButton(mobileSheet === "views")}
        >
          <Icon name={currentView.icon} size={17} className="text-[var(--ink)]" />
          View
        </button>
        <button
          type="button"
          onClick={() => toggleSheet("transfer")}
          aria-pressed={mobileSheet === "transfer"}
          className={dockButton(mobileSheet === "transfer")}
        >
          <Icon name="grid" size={17} className="text-[var(--ink)]" />
          Transfer
        </button>
        <button
          type="button"
          onClick={() => toggleSheet("analyze")}
          aria-pressed={mobileSheet === "analyze"}
          className={dockButton(mobileSheet === "analyze")}
        >
          <Icon name="pipette" size={17} className="text-[var(--ink)]" />
          Analyze
        </button>
        <button
          type="button"
          onClick={() => {
            if (panelTab === "compare") setPanelTab("colors");
            toggleSheet("paint");
          }}
          aria-pressed={mobileSheet === "paint"}
          className={dockButton(mobileSheet === "paint")}
        >
          <Icon name="brush" size={17} className="text-[var(--ink)]" />
          Paint
          {doneCount > 0 && (
            <span className="absolute right-1 top-0 rounded-full bg-[var(--accent-2)] px-1 text-[8px] leading-3 text-white">
              {doneCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => toggleSheet("compare")}
          aria-pressed={mobileSheet === "compare"}
          className={dockButton(mobileSheet === "compare")}
        >
          <Icon name="compare" size={17} className="text-[var(--ink)]" />
          Compare
        </button>
      </nav>
    </div>
  );
}
