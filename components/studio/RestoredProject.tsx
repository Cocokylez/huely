"use client";

import { useEffect, useRef, useState } from "react";
import type { HistoryProject } from "@/lib/history/types";
import { rgbToHex } from "@/lib/image/color";
import { patchDone } from "@/lib/history/save";
import { Palette } from "./Palette";
import { SampleReadout } from "./SampleReadout";

interface Props {
  project: HistoryProject;
  authed: boolean;
  onNew: () => void;
}

/** A saved project reopened from History — eyedroppable thumbnail, palette, and
 *  a progress checklist that keeps saving as you paint. */
export function RestoredProject({ project, authed, onNew }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sample, setSample] = useState<string | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [done, setDone] = useState<Set<number>>(new Set(project.done));

  useEffect(() => {
    setDone(new Set(project.done));
  }, [project.done]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d", { willReadFrequently: true })?.drawImage(img, 0, 0);
      setSize({ w: img.width, h: img.height });
    };
    img.src = project.thumbDataUrl;
  }, [project.thumbDataUrl]);

  const samplePoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !size) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((clientX - rect.left) / rect.width) * size.w);
    const y = Math.floor(((clientY - rect.top) / rect.height) * size.h);
    if (x < 0 || y < 0 || x >= size.w || y >= size.h) return;
    const d = canvas.getContext("2d", { willReadFrequently: true })!.getImageData(x, y, 1, 1).data;
    setSample(rgbToHex(d[0], d[1], d[2]).toUpperCase());
  };

  const toggleDone = (i: number) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      patchDone(authed, project.id, [...next]).catch(() => {});
      return next;
    });
  };

  const total = project.palette.length;
  const doneCount = [...done].filter((i) => i < total).length;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <b className="truncate text-[15px]">{project.name}</b>
        <span className="flex-none text-[12px] text-[var(--ink-soft)]">
          {new Date(project.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} ·{" "}
          {total} colors
        </span>
      </div>

      <div className="rounded-[18px] bg-[var(--card)] p-2 shadow-[var(--shadow-sm)]">
        <canvas
          ref={canvasRef}
          onPointerDown={(e) => samplePoint(e.clientX, e.clientY)}
          className="mx-auto block h-auto max-w-full cursor-crosshair rounded-[14px]"
          aria-label={project.name}
        />
        <p className="mt-1.5 pb-1 text-center text-[12px] text-[var(--ink-soft)]">
          Tap the image to pick up a color
        </p>
      </div>

      {sample && <SampleReadout hex={sample} />}

      <div className="mt-6">
        <h2 className="mb-3 text-[17px] font-bold">Palette</h2>
        <div className="mb-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--paper-2)]">
            <div
              className="h-full rounded-full bg-[var(--accent-2)] transition-all"
              style={{ width: `${total ? (doneCount / total) * 100 : 0}%` }}
            />
          </div>
          <span className="flex-none text-[12px] font-semibold text-[var(--ink-soft)]">
            {doneCount === total && total > 0 ? "All done 🎉" : `${doneCount} of ${total} done`}
          </span>
        </div>
        <Palette colors={project.palette} done={done} onToggleDone={toggleDone} />
      </div>

      <div className="mt-6">
        <button
          onClick={onNew}
          className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-[14px] font-semibold text-white active:scale-[0.98]"
        >
          New photo
        </button>
      </div>
    </div>
  );
}
