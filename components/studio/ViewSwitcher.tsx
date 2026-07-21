"use client";

import type { ViewMode } from "@/lib/image/types";

const VIEWS: { id: ViewMode; label: string }[] = [
  { id: "oil", label: "Oil paint" },
  { id: "original", label: "Original" },
  { id: "pbn", label: "Paint by numbers" },
];

interface Props {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
}

export function ViewSwitcher({ view, onChange }: Props) {
  return (
    <div className="mb-4 flex gap-1 rounded-full bg-neutral-200/70 p-1" role="tablist">
      {VIEWS.map((v) => (
        <button
          key={v.id}
          role="tab"
          aria-selected={view === v.id}
          onClick={() => onChange(v.id)}
          className={`flex-1 rounded-full px-2 py-2 text-sm font-semibold transition ${
            view === v.id ? "bg-white text-neutral-900 shadow" : "text-neutral-500"
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
