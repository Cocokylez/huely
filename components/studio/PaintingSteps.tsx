"use client";

import { useMemo } from "react";
import type { PaletteColor } from "@/lib/image/types";
import { buildPaintingSteps } from "@/lib/image/paintingSteps";
import { solveRecipe } from "@/lib/image/recipes";
import { nearestName } from "@/lib/image/colorNames";
import { useMyPaints } from "@/components/mixer/myPaints";
import { Icon } from "@/components/ui/Icon";

interface Props {
  palette: PaletteColor[];
  index: Uint8Array;
  done: Set<number>;
  onToggleDone: (i: number) => void;
  focus: number | null;
  onFocus: (i: number) => void;
}

/**
 * "How to paint this" — the palette turned into an ordered plan: what to put
 * down first, what it's for, and the mix to make it from the painter's tubes.
 */
export function PaintingSteps({ palette, index, done, onToggleDone, focus, onFocus }: Props) {
  const myPaints = useMyPaints();

  const steps = useMemo(() => buildPaintingSteps(palette, index), [palette, index]);
  const recipes = useMemo(
    () => steps.map((s) => solveRecipe([s.color.r, s.color.g, s.color.b], myPaints)),
    [steps, myPaints],
  );

  if (!steps.length) return null;

  return (
    <div>
      <h2 className="text-[17px] font-bold">How to paint this</h2>
      <p className="mb-3 mt-0.5 text-[12px] text-[var(--ink-soft)]">
        Work top to bottom — biggest area first, then darks, then lights. Tap a step to see just
        that color on the image.
      </p>

      <ol className="flex flex-col gap-2">
        {steps.map((s, n) => {
          const isDone = done.has(s.index);
          const isActive = focus === s.index;
          const recipe = recipes[n];
          return (
            <li
              key={s.index}
              className={`rounded-xl border p-3 transition ${
                isActive
                  ? "border-[var(--accent)] ring-1 ring-[var(--accent)]"
                  : isDone
                    ? "border-[var(--accent-2)] opacity-70"
                    : "border-[var(--line)]"
              } bg-[var(--card)]`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="grid h-9 w-9 flex-none place-items-center rounded-[10px] border border-black/10 text-[12px] font-bold text-white"
                  style={{ background: s.color.hex, textShadow: "0 1px 2px rgba(0,0,0,0.45)" }}
                >
                  {n + 1}
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="flex items-center gap-1.5">
                    <b className="text-[13px]">{s.label}</b>
                    <span className="rounded-full bg-[var(--paper-2)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--ink-soft)]">
                      {s.coverage >= 0.005 ? `${Math.round(s.coverage * 100)}%` : "<1%"} of the
                      picture
                    </span>
                  </div>
                  <span className="block text-[12px] text-[var(--ink-soft)]">
                    {nearestName(s.color.r, s.color.g, s.color.b)} ·{" "}
                    <span style={{ fontFamily: "var(--mono)" }}>{s.color.hex.toUpperCase()}</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleDone(s.index)}
                  aria-pressed={isDone}
                  aria-label={isDone ? `Mark ${s.label} not done` : `Mark ${s.label} done`}
                  title={isDone ? "Mark not done" : "Mark done"}
                  className={`grid h-9 w-9 flex-none place-items-center rounded-full border text-[13px] font-bold transition ${
                    isDone
                      ? "border-[var(--accent-2)] bg-[var(--accent-2)] text-white"
                      : "border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--accent-2)]"
                  }`}
                >
                  <Icon name="check" size={16} strokeWidth={2.2} />
                </button>
              </div>

              {/* Mix recipe from the painter's own tubes */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px]">
                <span className="text-[var(--ink-soft)]">Mix:</span>
                {recipe.parts.map((p) => (
                  <span
                    key={p.paint.name}
                    className="flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--card-2)] py-0.5 pl-1 pr-2 font-semibold"
                  >
                    <span
                      aria-hidden
                      className="h-3.5 w-3.5 rounded-full border border-black/15"
                      style={{ background: p.paint.hex }}
                    />
                    {p.parts} × {p.paint.name}
                  </span>
                ))}
              </div>

              <p className="mt-2 text-[12px] leading-relaxed text-[var(--ink-soft)]">{s.tip}</p>

              <button
                type="button"
                onClick={() => onFocus(s.index)}
                aria-pressed={isActive}
                aria-label={isActive ? `Showing where to paint ${s.label}` : `Show where to paint ${s.label}`}
                className={`mt-2 rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-95 ${
                  isActive
                    ? "bg-[var(--accent)] text-white"
                    : "border border-[var(--line)] bg-[var(--card-2)] text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                }`}
              >
                {isActive ? "Showing this color" : "Show me where"}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
