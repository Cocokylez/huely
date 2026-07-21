"use client";

import { useRef, useState } from "react";
import { usePipeline } from "@/lib/hooks/usePipeline";
import { COLOR_COUNT_OPTIONS } from "@/lib/image/constants";
import type { ViewMode } from "@/lib/image/types";
import type { HistoryProject } from "@/lib/history/types";
import { saveProject } from "@/lib/history/save";
import { imageDataToThumb } from "@/lib/image/thumbnail";
import { useMixer } from "@/components/mixer/MixerProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { Uploader } from "./Uploader";
import { ViewSwitcher } from "./ViewSwitcher";
import { ImageCanvas } from "./ImageCanvas";
import { Palette } from "./Palette";
import { SampleReadout } from "./SampleReadout";

export function StudioClient({ authed }: { authed: boolean }) {
  const { status, result, error, colorCount, process, setColorCount, reset } = usePipeline();
  const { slots } = useMixer();
  const { toast } = useToast();
  const [view, setView] = useState<ViewMode>("oil");
  const [sample, setSample] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const saveToHistory = async () => {
    if (!result) return;
    setSaving(true);
    const project: HistoryProject = {
      id: crypto.randomUUID(),
      name: new Date().toLocaleString(),
      colorCount,
      palette: result.palette,
      mixer: slots,
      thumbDataUrl: imageDataToThumb(result.oil),
      createdAt: Date.now(),
    };
    try {
      await saveProject(authed, project);
      toast(authed ? "Saved to your history" : "Saved on this device");
    } catch {
      toast("Couldn't save — try again");
    } finally {
      setSaving(false);
    }
  };

  const startOver = () => {
    setSample(null);
    setView("oil");
    reset();
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `huely-${view}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  if (!result) {
    if (status === "processing") {
      return (
        <div className="flex flex-col items-center gap-5 py-20">
          <div className="h-11 w-11 animate-spin rounded-full border-4 border-neutral-200 border-t-[var(--accent,#c65d3b)]" />
          <p className="text-neutral-500">Mixing your palette…</p>
        </div>
      );
    }
    return <Uploader onFile={process} error={error} />;
  }

  return (
    <div>
      <ViewSwitcher view={view} onChange={setView} />

      <div className="rounded-2xl bg-white/60 p-2.5 shadow">
        <ImageCanvas result={result} view={view} onSample={setSample} canvasRef={canvasRef} />
        <p className="mt-2 text-center text-xs text-neutral-500">Tap the image to pick up a color</p>
      </div>

      {sample && <SampleReadout hex={sample} />}

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Your palette</h2>
          <label className="flex items-center gap-2 text-xs text-neutral-500">
            Colors
            <select
              value={colorCount}
              onChange={(e) => setColorCount(parseInt(e.target.value, 10))}
              className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-sm"
            >
              {COLOR_COUNT_OPTIONS.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
        <Palette colors={result.palette} />
        <p className="mt-3 text-xs text-neutral-500">
          Tap a swatch to copy its color, or <b>+ Mixer</b> to send it to the mixer.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2.5">
        <button
          onClick={saveToHistory}
          disabled={saving}
          className="flex-1 rounded-xl bg-[var(--accent,#c65d3b)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save to history"}
        </button>
        <button
          onClick={download}
          className="rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold hover:border-neutral-500"
        >
          Download
        </button>
        <button
          onClick={startOver}
          className="rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold hover:border-neutral-500"
        >
          New photo
        </button>
      </div>
    </div>
  );
}
