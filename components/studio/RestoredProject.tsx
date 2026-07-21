"use client";

import { useEffect, useRef, useState } from "react";
import type { HistoryProject } from "@/lib/history/types";
import { rgbToHex } from "@/lib/image/color";
import { Palette } from "./Palette";
import { SampleReadout } from "./SampleReadout";

interface Props {
  project: HistoryProject;
  onNew: () => void;
}

/** A saved project reopened from History — thumbnail (eyedroppable), palette, restored mixer. */
export function RestoredProject({ project, onNew }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sample, setSample] = useState<string | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

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
    const d = canvas
      .getContext("2d", { willReadFrequently: true })!
      .getImageData(x, y, 1, 1).data;
    setSample(rgbToHex(d[0], d[1], d[2]).toUpperCase());
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <b className="truncate text-[15px]">{project.name}</b>
        <span className="flex-none text-[12px] text-[var(--ink-soft)]">
          {new Date(project.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} ·{" "}
          {project.palette.length} colors
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
        <Palette colors={project.palette} />
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
