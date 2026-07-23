"use client";

import { useCallback, useEffect, useState } from "react";
import type { HistoryProject } from "@/lib/history/types";
import { patchDone } from "@/lib/history/save";
import { Palette } from "./Palette";
import { SampleReadout } from "./SampleReadout";
import { WorkspaceView } from "./WorkspaceView";

interface Props {
  project: HistoryProject;
  authed: boolean;
  onNew: () => void;
}

/** A saved project reopened from History — the full painting workspace on the
 *  saved thumbnail (zoom, grid, value, flip, eyedropper) plus a progress
 *  checklist that keeps saving as you paint. */
export function RestoredProject({ project, authed, onNew }: Props) {
  const [sample, setSample] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [done, setDone] = useState<Set<number>>(new Set(project.done));

  useEffect(() => setDone(new Set(project.done)), [project.done]);

  useEffect(() => {
    const image = new Image();
    image.onload = () => setImg(image);
    image.src = project.thumbDataUrl;
  }, [project.thumbDataUrl]);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (img) ctx.drawImage(img, 0, 0);
    },
    [img],
  );

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
        {img ? (
          <WorkspaceView
            width={img.width}
            height={img.height}
            draw={draw}
            onSample={setSample}
            workspaceId={project.id}
          />
        ) : (
          <div className="aspect-[4/3] w-full animate-pulse rounded-[14px] bg-[var(--paper-2)]" />
        )}
        <p className="mt-1.5 pb-1 text-center text-[12px] text-[var(--ink-soft)]">
          Tap to pick a color · pinch or scroll to zoom · use grid / value / flip
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
            {doneCount === total && total > 0 ? "Painting complete" : `${doneCount} of ${total} done`}
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
