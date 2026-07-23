"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePipeline } from "@/lib/hooks/usePipeline";
import { COLOR_COUNT_OPTIONS } from "@/lib/image/constants";
import type { ViewMode } from "@/lib/image/types";
import type { HistoryProject } from "@/lib/history/types";
import {
  saveProject,
  updateProject,
  getProject,
  patchDone,
  cacheSource,
  getCachedSource,
} from "@/lib/history/save";
import { imageDataToThumb } from "@/lib/image/thumbnail";
import { nearestName } from "@/lib/image/colorNames";
import { buildPaintingSteps } from "@/lib/image/paintingSteps";
import {
  downloadImageData,
  printGuide,
  imageDataToDataUrl,
  imageDataToJpegDataUrl,
} from "@/lib/exports";
import { useMixer } from "@/components/mixer/MixerProvider";
import { useCreateFlow } from "@/components/create/CreateProvider";
import { setMixSource } from "@/components/mixer/mixSource";
import { useToast } from "@/components/ui/ToastProvider";
import { Icon } from "@/components/ui/Icon";
import { Uploader } from "./Uploader";
import { Processing } from "./Processing";
import { ViewSwitcher } from "./ViewSwitcher";
import { ImageCanvas } from "./ImageCanvas";
import { Palette } from "./Palette";
import { SampleReadout } from "./SampleReadout";
import { RestoredProject } from "./RestoredProject";
import { FocusWorkspace } from "./FocusWorkspace";
import { PaintingSteps } from "./PaintingSteps";
import { CanvasShot } from "./CanvasShot";
import { BeginnerGuide, shouldShowBeginnerGuide } from "./BeginnerGuide";

function defaultName() {
  return (
    new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " · " +
    new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  );
}

interface Props {
  authed: boolean;
  openId?: string;
}

export function StudioClient({ authed, openId }: Props) {
  const {
    status,
    stage,
    result,
    error,
    colorCount,
    quality,
    previewUrl,
    process,
    processDataUrl,
    setColorCount,
    setQuality,
    reset,
  } = usePipeline();
  const { slots, loadSlots } = useMixer();
  const { toast } = useToast();
  const router = useRouter();
  const { draft, consumeDraft } = useCreateFlow();

  const [view, setView] = useState<ViewMode>("oil");
  const [sample, setSample] = useState<string | null>(null);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [focusColor, setFocusColor] = useState<number | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const guideCheckedRef = useRef(false);
  const openWorkspaceOnReadyRef = useRef(true);
  const handledDraftRef = useRef<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [projectId, setProjectId] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const pendingSaveRef = useRef<"new" | "update" | null>(null);
  const thumbRef = useRef<string>("");

  const [restored, setRestored] = useState<HistoryProject | null>(null);
  const openProject = useCallback(
    async (id: string) => {
      try {
        const p = await getProject(authed, id);
        if (!p) return;
        setMixSource(p.palette);
        if (p.mixer.length) loadSlots(p.mixer);

        const src = await getCachedSource(id);
        if (src) {
          // Full-res: reconstruct the whole workspace from the device-cached image.
          setRestored(null);
          setProjectId(p.id);
          setName(p.name);
          setSaved(true);
          setDone(new Set(p.done));
          setFocusColor(null);
          setSample(null);
          setView("oil");
          openWorkspaceOnReadyRef.current = true;
          pendingSaveRef.current = null;
          await processDataUrl(src, p.colorCount);
        } else {
          // No local cache (e.g. opened on another device) → thumbnail fallback.
          setRestored(p);
        }
      } catch {
        toast("Couldn't open that project");
      }
    },
    [authed, loadSlots, toast, processDataUrl],
  );

  useEffect(() => {
    if (openId) openProject(openId);
  }, [openId, openProject]);

  useEffect(() => {
    if (result) setMixSource(result.palette, buildPaintingSteps(result.palette, result.index));
  }, [result]);
  useEffect(() => {
    if (!result || guideCheckedRef.current) return;
    guideCheckedRef.current = true;
    if (shouldShowBeginnerGuide()) setGuideOpen(true);
  }, [result]);
  useEffect(() => {
    if (status !== "ready" || !result || !openWorkspaceOnReadyRef.current) return;
    openWorkspaceOnReadyRef.current = false;
    setFocusMode(true);
  }, [result, status]);
  useEffect(() => () => setMixSource([]), []);

  // Auto-save on process; update on re-quantize.
  useEffect(() => {
    if (status !== "ready" || !result || !pendingSaveRef.current) return;
    const kind = pendingSaveRef.current;
    pendingSaveRef.current = null;

    const thumb = imageDataToThumb(result.oil);
    thumbRef.current = thumb;
    const id = kind === "new" ? crypto.randomUUID() : projectId!;
    const nm = kind === "new" ? defaultName() : name;

    const project: HistoryProject = {
      id,
      name: nm,
      colorCount,
      palette: result.palette,
      mixer: slots,
      done: kind === "new" ? [] : [...done],
      thumbDataUrl: thumb,
      createdAt: Date.now(),
    };

    (kind === "new" ? saveProject(authed, project) : updateProject(authed, project))
      .then(() => {
        if (kind === "new") {
          setProjectId(id);
          setName(nm);
          setDone(new Set());
          // Cache the full working-res source on-device for full-res reopen.
          cacheSource(id, imageDataToJpegDataUrl(result.original));
        }
        setSaved(true);
      })
      .catch(() => setSaved(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, result]);

  const handleFile = useCallback(
    (file: File) => {
      setRestored(null);
      setSample(null);
      setView("oil");
      setDone(new Set());
      setFocusColor(null);
      setFocusMode(false);
      setGuideOpen(false);
      openWorkspaceOnReadyRef.current = true;
      setProjectId(null);
      setSaved(false);
      pendingSaveRef.current = "new";
      process(file);
    },
    [process],
  );

  useEffect(() => {
    if (!draft || handledDraftRef.current === draft.id) return;
    handledDraftRef.current = draft.id;
    consumeDraft(draft.id);
    handleFile(draft.file);
  }, [consumeDraft, draft, handleFile]);

  const requantize = (n: number) => {
    setDone(new Set()); // palette indices change meaning at a new count
    setFocusColor(null);
    if (projectId) pendingSaveRef.current = "update";
    setColorCount(n);
  };

  const toggleDone = (i: number) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      if (projectId) patchDone(authed, projectId, [...next]).catch(() => {});
      return next;
    });
  };

  const toggleFocus = (i: number) => setFocusColor((f) => (f === i ? null : i));

  // Mark the active color done and advance to the next unfinished color.
  const doneAndNext = () => {
    if (focusColor == null || !result) return;
    const n = result.palette.length;
    const next = new Set(done);
    next.add(focusColor);
    setDone(next);
    if (projectId) patchDone(authed, projectId, [...next]).catch(() => {});
    let advance: number | null = null;
    for (let k = 1; k <= n; k++) {
      const cand = (focusColor + k) % n;
      if (!next.has(cand)) {
        advance = cand;
        break;
      }
    }
    setFocusColor(advance);
  };

  const commitRename = async (nextName: string) => {
    setEditing(false);
    const trimmed = nextName.trim();
    if (!trimmed || trimmed === name || !projectId || !result) return;
    setName(trimmed);
    try {
      await updateProject(authed, {
        id: projectId,
        name: trimmed,
        colorCount,
        palette: result.palette,
        mixer: slots,
        done: [...done],
        thumbDataUrl: thumbRef.current || imageDataToThumb(result.oil),
        createdAt: Date.now(),
      });
    } catch {
      toast("Couldn't rename");
    }
  };

  const startOver = () => {
    setRestored(null);
    setSample(null);
    setView("oil");
    setDone(new Set());
    setFocusColor(null);
    setFocusMode(false);
    setGuideOpen(false);
    openWorkspaceOnReadyRef.current = true;
    setProjectId(null);
    setSaved(false);
    reset();
    setMixSource([]);
    if (openId) router.replace("/create");
  };

  const exitWorkspace = () => {
    router.replace("/");
  };

  const download = () => {
    if (!result) return;
    if (view === "pbn" && canvasRef.current) {
      canvasRef.current.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "huely-by-numbers.png";
        a.click();
        URL.revokeObjectURL(url);
      });
      return;
    }
    const layer = view === "original" ? result.original : result.oil;
    downloadImageData(layer, `huely-${view}.png`);
  };

  const print = () => {
    if (!result || !canvasRef.current) return;
    const dataUrl =
      view === "pbn" ? canvasRef.current.toDataURL("image/png") : imageDataToDataUrl(result.pbnBase);
    printGuide(dataUrl, result.palette, name || "Paint-by-numbers guide");
  };

  // ---- Screens ----
  if (restored) {
    return <RestoredProject project={restored} authed={authed} onNew={startOver} />;
  }

  if (!result) {
    if (status === "processing") {
      return <Processing stage={stage} previewUrl={previewUrl} onCancel={startOver} />;
    }
    return (
      <Uploader
        onFile={handleFile}
        quality={quality}
        onQuality={setQuality}
        error={error}
      />
    );
  }

  const total = result.palette.length;
  const doneCount = [...done].filter((i) => i < total).length;

  return (
    <div>
      <BeginnerGuide
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        onOpenWorkspace={() => setFocusMode(true)}
      />

      <div className="mb-2 flex items-center justify-between gap-3">
        {editing ? (
          <input
            autoFocus
            aria-label="Project name"
            defaultValue={name}
            onBlur={(e) => commitRename(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setEditing(false);
            }}
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--card-2)] px-3 py-2 text-[15px] font-bold outline-none focus:border-[var(--accent)]"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            title="Rename"
            aria-label={`Rename project ${name || "Untitled"}`}
            className="flex min-w-0 items-center gap-1.5 text-left"
          >
            <b className="truncate text-[15px]">{name || "Untitled"}</b>
            <Icon name="edit" size={13} className="text-[var(--ink-soft)]" />
          </button>
        )}
        <span role="status" aria-live="polite" className="flex flex-none items-center gap-1 text-[12px] text-[var(--ink-soft)]">
          {saved && <><Icon name="check" size={13} /> Saved</>}
        </span>
      </div>

      {focusMode && (
        <FocusWorkspace
          projectId={projectId}
          result={result}
          view={view}
          onView={setView}
          onSample={setSample}
          done={done}
          onToggleDone={toggleDone}
          focusColor={focusColor}
          onFocus={toggleFocus}
          onRestoreFocus={setFocusColor}
          onDoneNext={doneAndNext}
          onClearFocus={() => setFocusColor(null)}
          onExit={exitWorkspace}
        />
      )}

      <div className="mb-3 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <ViewSwitcher view={view} onChange={setView} />
        </div>
        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          title="Beginner guide"
          aria-label="Open beginner painting guide"
          className="grid h-9 w-9 flex-none place-items-center rounded-full border border-[var(--line)] bg-[var(--card)] text-[13px] font-bold text-[var(--ink-soft)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          <Icon name="help" size={17} />
        </button>
        <button
          type="button"
          onClick={() => setFocusMode(true)}
          title="Focus workspace"
          aria-label="Open full-screen painting workspace"
          className="grid h-9 w-9 flex-none place-items-center rounded-full border border-[var(--line)] bg-[var(--card)] text-[var(--ink-soft)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          <Icon name="maximize" size={17} />
        </button>
      </div>

      <div className="rounded-[18px] bg-[var(--card)] p-2 shadow-[var(--shadow-sm)]">
        <ImageCanvas
          result={result}
          view={view}
          onSample={setSample}
          canvasRef={canvasRef}
          done={done}
          focus={focusColor}
        />
        <p className="mt-1.5 pb-1 text-center text-[12px] text-[var(--ink-soft)]">
          Tap to pick a color · pinch or scroll to zoom · drag to pan
          <span className="block text-[10px] capitalize">
            {result.original.width}×{result.original.height} original · {result.w}×{result.h} paint render · {result.quality}
          </span>
        </p>
      </div>

      {focusColor != null && result.palette[focusColor] && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_7%,var(--card))] p-2.5">
          <span
            className="grid h-9 w-9 flex-none place-items-center rounded-[9px] text-[13px] font-bold text-white"
            style={{ background: result.palette[focusColor].hex }}
          >
            {focusColor + 1}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <b className="text-[13px]">Painting this color</b>
            <small className="block text-[12px] text-[var(--ink-soft)]">
              {nearestName(
                result.palette[focusColor].r,
                result.palette[focusColor].g,
                result.palette[focusColor].b,
              )}{" "}
              · {result.palette[focusColor].hex.toUpperCase()}
            </small>
          </div>
          <button
            onClick={doneAndNext}
            className="flex-none rounded-full bg-[var(--accent-2)] px-3 py-1.5 text-[12px] font-semibold text-white active:scale-95"
          >
            Done · next
          </button>
          <button
            onClick={() => setFocusColor(null)}
            className="flex-none rounded-full border border-[var(--line)] bg-[var(--card-2)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ink-soft)] hover:text-[var(--ink)]"
          >
            Show all
          </button>
        </div>
      )}

      {sample && <SampleReadout hex={sample} />}

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[17px] font-bold">Your palette</h2>
          <label className="flex items-center gap-2 text-[13px] text-[var(--ink-soft)]">
            Colors
            <select
              value={colorCount}
              onChange={(e) => requantize(parseInt(e.target.value, 10))}
              className="rounded-lg border border-[var(--line)] bg-[var(--card-2)] px-2 py-1 text-[13px] text-[var(--ink)]"
            >
              {COLOR_COUNT_OPTIONS.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>

        {/* Progress */}
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
            {doneCount === total && total > 0 ? "Painting complete" : `${doneCount} of ${total} done`}
          </span>
        </div>

        <Palette
          colors={result.palette}
          done={done}
          onToggleDone={toggleDone}
          focus={focusColor}
          onFocus={toggleFocus}
        />
        <p className="mt-3 text-[12px] text-[var(--ink-soft)]">
          Tap a chip to copy · use the target button to isolate it · add it to Mixer · mark it done when painted.
        </p>
      </div>

      <div className="mt-7">
        <PaintingSteps
          palette={result.palette}
          index={result.index}
          done={done}
          onToggleDone={toggleDone}
          focus={focusColor}
          onFocus={toggleFocus}
        />
      </div>

      <div className="mt-7">
        <CanvasShot projectId={projectId} result={result} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2.5">
        <button
          onClick={download}
          className="flex-1 rounded-xl bg-[var(--accent)] px-4 py-3 text-[14px] font-semibold text-white active:scale-[0.98]"
        >
          Download
        </button>
        <button
          onClick={print}
          className="rounded-xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 text-[14px] font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-[0.98]"
        >
          Print guide
        </button>
        <button
          onClick={startOver}
          className="rounded-xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 text-[14px] font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-[0.98]"
        >
          New photo
        </button>
      </div>
    </div>
  );
}
