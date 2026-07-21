"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePipeline } from "@/lib/hooks/usePipeline";
import { COLOR_COUNT_OPTIONS } from "@/lib/image/constants";
import type { ViewMode } from "@/lib/image/types";
import type { HistoryProject } from "@/lib/history/types";
import { saveProject, updateProject, getProject } from "@/lib/history/save";
import { imageDataToThumb } from "@/lib/image/thumbnail";
import { downloadImageData, printGuide, imageDataToDataUrl } from "@/lib/exports";
import { useMixer } from "@/components/mixer/MixerProvider";
import { setMixSource } from "@/components/mixer/mixSource";
import { useToast } from "@/components/ui/ToastProvider";
import { Uploader } from "./Uploader";
import { Processing } from "./Processing";
import { ViewSwitcher } from "./ViewSwitcher";
import { ImageCanvas } from "./ImageCanvas";
import { Palette } from "./Palette";
import { SampleReadout } from "./SampleReadout";
import { RestoredProject } from "./RestoredProject";

function defaultName() {
  return new Date().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  }) + " · " + new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

interface Props {
  authed: boolean;
  openId?: string;
}

export function StudioClient({ authed, openId }: Props) {
  const { status, stage, result, error, colorCount, previewUrl, process, setColorCount, reset } =
    usePipeline();
  const { slots, loadSlots } = useMixer();
  const { toast } = useToast();
  const router = useRouter();

  const [view, setView] = useState<ViewMode>("oil");
  const [sample, setSample] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Auto-saved project state (spec: auto-save on process, ✎ renames inline).
  const [projectId, setProjectId] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const pendingSaveRef = useRef<"new" | "update" | null>(null);

  // Restored project (opened from History / Recent).
  const [restored, setRestored] = useState<HistoryProject | null>(null);
  useEffect(() => {
    if (!openId) return;
    getProject(authed, openId)
      .then((p) => {
        if (p) {
          setRestored(p);
          setMixSource(p.palette);
          if (p.mixer.length) loadSlots(p.mixer);
        }
      })
      .catch(() => toast("Couldn't open that project"));
  }, [openId, authed, loadSlots, toast]);

  // Publish the current palette to the mixer's "From your palette" chips.
  useEffect(() => {
    if (result) setMixSource(result.palette);
  }, [result]);
  useEffect(() => () => setMixSource([]), []);

  // Auto-save on process; update on re-quantize.
  useEffect(() => {
    if (status !== "ready" || !result || !pendingSaveRef.current) return;
    const kind = pendingSaveRef.current;
    pendingSaveRef.current = null;

    const project: HistoryProject = {
      id: kind === "new" ? crypto.randomUUID() : projectId!,
      name: kind === "new" ? defaultName() : name,
      colorCount,
      palette: result.palette,
      mixer: slots,
      thumbDataUrl: imageDataToThumb(result.oil),
      createdAt: Date.now(),
    };

    (kind === "new" ? saveProject(authed, project) : updateProject(authed, project))
      .then(() => {
        if (kind === "new") {
          setProjectId(project.id);
          setName(project.name);
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
      setProjectId(null);
      setSaved(false);
      pendingSaveRef.current = "new";
      process(file);
    },
    [process],
  );

  const requantize = (n: number) => {
    if (projectId) pendingSaveRef.current = "update";
    setColorCount(n);
  };

  const commitRename = async (next: string) => {
    setEditing(false);
    const trimmed = next.trim();
    if (!trimmed || trimmed === name || !projectId || !result) return;
    setName(trimmed);
    try {
      await updateProject(authed, {
        id: projectId,
        name: trimmed,
        colorCount,
        palette: result.palette,
        mixer: slots,
        thumbDataUrl: imageDataToThumb(result.oil),
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
    setProjectId(null);
    setSaved(false);
    reset();
    setMixSource([]);
    if (openId) router.replace("/");
  };

  const download = () => {
    if (!result) return;
    const layer = view === "original" ? result.original : view === "pbn" ? result.pbnBase : result.oil;
    // For PBN, capture the displayed canvas (labels included).
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
    downloadImageData(layer, `huely-${view}.png`);
  };

  const print = () => {
    if (!result || !canvasRef.current) return;
    const wasPbn = view === "pbn";
    // Print the paint-by-numbers view with its numbers, from the display canvas.
    const dataUrl = wasPbn
      ? canvasRef.current.toDataURL("image/png")
      : imageDataToDataUrl(result.pbnBase);
    printGuide(dataUrl, result.palette, name || "Paint-by-numbers guide");
  };

  // ---- Screens ----
  if (restored) {
    return <RestoredProject project={restored} onNew={startOver} />;
  }

  if (!result) {
    if (status === "processing") {
      return <Processing stage={stage} previewUrl={previewUrl} onCancel={startOver} />;
    }
    return <Uploader onFile={handleFile} onOpenProject={(id) => setRestoredById(id)} authed={authed} error={error} />;
  }

  function setRestoredById(id: string) {
    getProject(authed, id)
      .then((p) => {
        if (p) {
          setRestored(p);
          setMixSource(p.palette);
          if (p.mixer.length) loadSlots(p.mixer);
        }
      })
      .catch(() => toast("Couldn't open that project"));
  }

  return (
    <div>
      {/* Name + saved state */}
      <div className="mb-2 flex items-center justify-between gap-3">
        {editing ? (
          <input
            autoFocus
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
            onClick={() => setEditing(true)}
            title="Rename"
            className="flex min-w-0 items-center gap-1.5 text-left"
          >
            <b className="truncate text-[15px]">{name || "Untitled"}</b>
            <span className="text-[12px] text-[var(--ink-soft)]">✎</span>
          </button>
        )}
        <span className="flex-none text-[12px] text-[var(--ink-soft)]">{saved ? "Saved ✓" : ""}</span>
      </div>

      <div className="mb-3">
        <ViewSwitcher view={view} onChange={setView} />
      </div>

      <div className="rounded-[18px] bg-[var(--card)] p-2 shadow-[var(--shadow-sm)]">
        <ImageCanvas result={result} view={view} onSample={setSample} canvasRef={canvasRef} />
        <p className="mt-1.5 pb-1 text-center text-[12px] text-[var(--ink-soft)]">
          Tap the image to pick up a color
        </p>
      </div>

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
        <Palette colors={result.palette} />
        <p className="mt-3 text-[12px] text-[var(--ink-soft)]">
          Tap a chip to copy its color, or <b>+ Mixer</b> to blend it.
        </p>
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
