"use client";

import type { PipelineStage } from "@/lib/worker/messages";

const STAGES: { id: PipelineStage; label: string }[] = [
  { id: "painting", label: "Painting…" },
  { id: "colors", label: "Pulling out your colors…" },
  { id: "numbering", label: "Numbering regions…" },
];

interface Props {
  stage: PipelineStage | null;
  previewUrl: string | null;
  onCancel: () => void;
}

/** Processing — photo shows immediately, dimmed with shimmer; staged copy (spec 03). */
export function Processing({ stage, previewUrl, onCancel }: Props) {
  const activeIdx = Math.max(0, STAGES.findIndex((s) => s.id === stage));

  return (
    <div>
      <div className="rounded-[18px] bg-[var(--card)] p-2 shadow-[var(--shadow-sm)]">
        <div className="relative h-[300px] overflow-hidden rounded-[14px] bg-[var(--paper-2)]">
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Your photo, processing"
              className="h-full w-full object-cover opacity-40"
            />
          )}
          <span className="shimmer absolute inset-0" aria-hidden />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-3">
        <span
          className="h-[18px] w-[18px] rounded-full border-[3px] border-[var(--line)]"
          style={{ borderTopColor: "var(--accent)", animation: "spin 0.9s linear infinite" }}
          aria-hidden
        />
        <span className="text-[14px] text-[var(--ink-soft)]" aria-live="polite">
          {STAGES[activeIdx].label}
        </span>
      </div>

      <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
        {STAGES.map((s, i) => (
          <span
            key={s.id}
            className="h-[3px] w-7 rounded-sm transition-colors"
            style={{ background: i <= activeIdx ? "var(--accent)" : "var(--line)" }}
          />
        ))}
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={onCancel}
          className="rounded-full border border-[var(--line)] bg-[var(--card)] px-4 py-2 text-[13px] font-semibold text-[var(--ink-soft)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
