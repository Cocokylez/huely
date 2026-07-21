"use client";

import type { ViewMode } from "@/lib/image/types";

const VIEWS: { id: ViewMode; label: string }[] = [
  { id: "oil", label: "Oil paint" },
  { id: "original", label: "Original" },
  { id: "pbn", label: "By numbers" },
];

interface Props {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
}

export function ViewSwitcher({ view, onChange }: Props) {
  return (
    <div className="flex gap-1 rounded-full bg-[var(--paper-2)] p-[3px]" role="tablist">
      {VIEWS.map((v) => (
        <button
          key={v.id}
          role="tab"
          aria-selected={view === v.id}
          onClick={() => onChange(v.id)}
          className={`flex-1 rounded-full px-2 py-2 text-[13px] font-semibold transition ${
            view === v.id
              ? "bg-[var(--card-2)] text-[var(--ink)] shadow-[var(--shadow-sm)]"
              : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
