"use client";

import { useState } from "react";
import { PAINT_CATALOG, type Paint } from "@/lib/image/recipes";
import { useMyPaints, getMyPaints, setMyPaints, togglePaint, resetMyPaints } from "./myPaints";
import { Icon } from "@/components/ui/Icon";

/** Inline editor to pick the tubes you own (recipes solve against these). */
export function MyPaintsEditor({ onClose }: { onClose: () => void }) {
  const mine = useMyPaints();
  const has = (p: Paint) => mine.some((m) => m.name === p.name);
  const custom = mine.filter((m) => !PAINT_CATALOG.some((c) => c.name === m.name));

  const [name, setName] = useState("");
  const [hex, setHex] = useState("#888888");

  const addCustom = () => {
    const n = name.trim();
    if (!n) return;
    if (!getMyPaints().some((p) => p.name.toLowerCase() === n.toLowerCase())) {
      setMyPaints([...getMyPaints(), { name: n, hex }]);
    }
    setName("");
  };

  const chip = (p: Paint, owned: boolean) => (
    <button
      key={p.name}
      onClick={() => togglePaint(p)}
      className={`flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-[12px] font-semibold transition ${
        owned
          ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,var(--card))] text-[var(--ink)]"
          : "border-[var(--line)] bg-[var(--card-2)] text-[var(--ink-soft)] hover:text-[var(--ink)]"
      }`}
      title={owned ? "Owned — tap to remove" : "Tap to add to your kit"}
    >
      <span className="h-4 w-4 flex-none rounded-full border border-black/15" style={{ background: p.hex }} />
      {p.name}
      <Icon name={owned ? "check" : "plus"} size={13} className="text-[var(--ink-soft)]" />
    </button>
  );

  return (
    <div className="mt-3 rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-[15px] font-bold">My paints</p>
          <p className="text-[12px] text-[var(--ink-soft)]">{mine.length} tubes · recipes use only these</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-full border border-[var(--line)] bg-[var(--paper-2)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ink-soft)] hover:text-[var(--ink)]"
        >
          Done
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PAINT_CATALOG.map((p) => chip(p, has(p)))}
        {custom.map((p) => chip(p, true))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <label
          className="relative h-8 w-8 flex-none cursor-pointer rounded-lg border border-[var(--line)]"
          style={{ background: hex }}
          title="Pick color"
        >
          <input
            type="color"
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Custom paint color"
          />
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addCustom();
          }}
          placeholder="Add a custom tube…"
          className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[var(--card-2)] px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)]"
        />
        <button
          onClick={addCustom}
          className="flex-none rounded-full bg-[var(--accent)] px-3 py-2 text-[12px] font-semibold text-white active:scale-95"
        >
          Add
        </button>
      </div>

      <button
        onClick={resetMyPaints}
        className="mt-2.5 text-[11px] font-semibold text-[var(--ink-soft)] underline hover:text-[var(--accent)]"
      >
        Reset to basics
      </button>
    </div>
  );
}
