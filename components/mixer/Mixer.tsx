"use client";

import { useEffect, useMemo, useState } from "react";
import { useMixer } from "./MixerProvider";
import { useMixSource, usePaintOrderSource } from "./mixSource";
import { useToast } from "@/components/ui/ToastProvider";
import { Icon, type IconName } from "@/components/ui/Icon";
import { nearestName } from "@/lib/image/colorNames";
import { rgbToHex } from "@/lib/image/color";
import { parseColorInput, solveRecipe } from "@/lib/image/recipes";
import { useMyPaints } from "./myPaints";
import { MyPaintsEditor } from "./MyPaintsEditor";
import { PaletteMixingBoard } from "./PaletteMixingBoard";

type LabTab = "recipe" | "mix" | "paints";

const LAB_TABS: { id: LabTab; label: string; icon: IconName }[] = [
  { id: "recipe", label: "Recipe", icon: "target" },
  { id: "mix", label: "Mixing board", icon: "palette" },
  { id: "paints", label: "My paints", icon: "brush" },
];

export function Mixer() {
  const { open, closeMixer } = useMixer();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMixer();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [closeMixer, open]);

  if (!open) return null;
  return <PaintLabDialog closeMixer={closeMixer} />;
}

function PaintLabDialog({ closeMixer }: { closeMixer: () => void }) {
  const [tab, setTab] = useState<LabTab>("recipe");

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center md:p-4">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close Paint Lab"
        className="absolute inset-0 bg-[rgba(30,22,14,0.5)] backdrop-blur-[2px]"
        onClick={closeMixer}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="paint-lab-title"
        className="relative flex h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[26px] border border-[var(--line)] bg-[var(--paper)] shadow-[0_24px_80px_rgba(0,0,0,0.32)] md:h-[calc(100dvh-2rem)] md:max-h-[760px] md:rounded-[26px]"
        style={{ animation: "sheet-up 0.26s cubic-bezier(0.2,0.8,0.2,1)" }}
      >
        <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-[var(--line)] md:hidden" aria-hidden />

        <header className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-3.5 md:px-5">
          <span className="grid h-10 w-10 flex-none place-items-center rounded-2xl bg-[var(--accent)] text-white">
            <Icon name="palette" size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="paint-lab-title" className="text-[18px] font-bold tracking-[-0.015em]">
              Paint Lab
            </h2>
          </div>
          <button
            type="button"
            onClick={closeMixer}
            aria-label="Close Paint Lab"
            className="grid h-10 w-10 flex-none place-items-center rounded-full border border-[var(--line)] bg-[var(--card)] text-[var(--ink-soft)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <Icon name="x" size={17} />
          </button>
        </header>

        <nav
          aria-label="Paint Lab sections"
          className="grid grid-cols-3 gap-1 border-b border-[var(--line)] bg-[var(--card)]/60 px-3 py-2"
        >
          {LAB_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-[12px] font-semibold transition ${
                tab === item.id
                  ? "bg-[var(--card-2)] text-[var(--accent)] shadow-[var(--shadow-sm)]"
                  : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
              }`}
            >
              <Icon name={item.icon} size={16} />
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 md:px-5 md:pt-5"
          style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
        >
          {tab === "recipe" && (
            <RecipeLab onOpenMix={() => setTab("mix")} onOpenPaints={() => setTab("paints")} />
          )}
          {tab === "mix" && <PaletteMixingBoard />}
          {tab === "paints" && <PaintKit />}
        </div>
      </section>
    </div>
  );
}

const QUALITY_COPY = {
  "spot-on": "Spot on — this mix hits your color.",
  close: "Close match — tweak the parts after a small test dab.",
  closest: "The closest mix available from the paints in your kit.",
} as const;

function RecipeLab({ onOpenMix, onOpenPaints }: { onOpenMix: () => void; onOpenPaints: () => void }) {
  const { target, setTarget, loadSlots } = useMixer();
  const { toast } = useToast();
  const myPaints = useMyPaints();
  const projectPalette = useMixSource();
  const [raw, setRaw] = useState(target ?? "");

  const parsed = useMemo(() => parseColorInput(raw), [raw]);
  const recipe = useMemo(() => (parsed ? solveRecipe(parsed, myPaints) : null), [parsed, myPaints]);
  const targetHex = parsed ? rgbToHex(parsed[0], parsed[1], parsed[2]).toUpperCase() : null;

  const chooseTarget = (hex: string) => {
    const normalized = hex.toUpperCase();
    setRaw(normalized);
    setTarget(normalized);
  };

  const loadRecipe = () => {
    if (!recipe) return;
    loadSlots(recipe.parts.map((part) => ({ hex: part.paint.hex, parts: part.parts })));
    toast("Recipe loaded into the mixing board");
    onOpenMix();
  };

  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <section className="rounded-[20px] border border-[var(--line)] bg-[var(--card)] p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[15px] font-bold">What color are you trying to make?</p>
            <p className="text-[12px] text-[var(--ink-soft)]">Paste a code, use the picker, or choose from this project.</p>
          </div>
          <button
            type="button"
            onClick={onOpenPaints}
            className="flex flex-none items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--paper-2)] px-3 py-1.5 text-[11px] font-semibold text-[var(--ink-soft)] hover:text-[var(--accent)]"
          >
            <Icon name="brush" size={14} /> {myPaints.length} paints
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={raw}
            onChange={(event) => {
              setRaw(event.target.value);
              if (!event.target.value) setTarget(null);
            }}
            placeholder="#5A7A52 or rgb(90, 122, 82)"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[var(--card-2)] px-3.5 py-3 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            style={{ fontFamily: "var(--mono)" }}
            aria-label="Target color"
          />
          <label
            className="relative h-[46px] w-[46px] flex-none cursor-pointer rounded-xl border border-[var(--line)]"
            style={{ background: targetHex ?? "var(--paper-2)" }}
            title="Pick a target color"
          >
            <input
              type="color"
              value={targetHex ?? "#808080"}
              onChange={(event) => chooseTarget(event.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label="Pick target color"
            />
          </label>
        </div>

        {projectPalette.length > 0 && (
          <div className="mt-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink-soft)]">
              From this project
            </p>
            <div className="flex flex-wrap gap-2">
              {projectPalette.map((color, index) => (
                <button
                  key={`${color.hex}-${index}`}
                  type="button"
                  onClick={() => chooseTarget(color.hex)}
                  aria-label={`Find a recipe for ${color.hex.toUpperCase()}`}
                  className="h-9 w-9 rounded-xl border border-[var(--line)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)]"
                  style={{ background: color.hex }}
                />
              ))}
            </div>
          </div>
        )}

        {raw && !parsed && (
          <p role="alert" className="mt-2 text-[12px] text-[var(--accent)]">
            That does not look like a color. Try a six-digit hex code such as #5A7A52.
          </p>
        )}
      </section>

      {recipe && targetHex ? (
        <section className="rounded-[20px] border border-[var(--line)] bg-[var(--card-2)] p-4 shadow-[var(--shadow-sm)]">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <div className="text-center">
              <span className="block h-14 w-14 rounded-2xl border border-black/10" style={{ background: targetHex }} />
              <span className="mt-1 block text-[11px] font-semibold text-[var(--ink-soft)]">Target</span>
            </div>
            <Icon name="arrowRight" size={20} className="justify-self-center text-[var(--ink-soft)]" />
            <div className="text-center">
              <span className="block h-14 w-14 rounded-2xl border border-black/10" style={{ background: recipe.hex }} />
              <span className="mt-1 block text-[11px] font-semibold text-[var(--ink-soft)]">Recipe</span>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {recipe.parts.map((part) => (
              <div key={part.paint.name} className="flex items-center gap-3 rounded-xl bg-[var(--paper-2)] px-3 py-2.5">
                <span className="h-7 w-7 flex-none rounded-lg border border-black/10" style={{ background: part.paint.hex }} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{part.paint.name}</span>
                <span className="rounded-full bg-[var(--card-2)] px-2.5 py-1 text-[12px] font-bold">
                  {part.parts} {part.parts === 1 ? "part" : "parts"}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-[var(--line)] pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] text-[var(--ink-soft)]">{QUALITY_COPY[recipe.quality]}</p>
            <button
              type="button"
              onClick={loadRecipe}
              className="flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-[12px] font-semibold text-white active:scale-[0.98]"
            >
              <Icon name="palette" size={15} /> Load mixing board
            </button>
          </div>
        </section>
      ) : (
        <div className="rounded-[20px] border border-dashed border-[var(--line)] px-5 py-8 text-center text-[12px] text-[var(--ink-soft)]">
          <Icon name="target" size={24} className="mx-auto mb-2 text-[var(--accent)]" />
          Choose a target color to reveal its real-paint recipe.
        </div>
      )}

      <PaintingOrder />
    </div>
  );
}

function PaintingOrder() {
  const steps = usePaintOrderSource();
  if (!steps.length) return null;

  return (
    <section className="rounded-[20px] border border-[var(--line)] bg-[var(--card)] p-4">
      <div className="mb-3 flex items-start gap-3">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-[color-mix(in_srgb,var(--accent)_12%,var(--card))] text-[var(--accent)]">
          <Icon name="listCheck" size={17} />
        </span>
        <div>
          <h3 className="text-[15px] font-bold">Painting order for this photo</h3>
          <p className="text-[11px] leading-relaxed text-[var(--ink-soft)]">
            Huely starts with the largest area, builds depth from dark to light, then saves small details for last.
          </p>
        </div>
      </div>

      <ol className="grid gap-2">
        {steps.map((step, order) => {
          const colorName = nearestName(step.color.r, step.color.g, step.color.b);
          const coverage = Math.max(1, Math.round(step.coverage * 100));
          return (
            <li
              key={`${step.index}-${order}`}
              className="grid grid-cols-[32px_38px_1fr] items-start gap-2.5 rounded-2xl bg-[var(--card-2)] p-2.5"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--ink)] text-[11px] font-bold text-[var(--paper)]">
                {order + 1}
              </span>
              <span
                className="mt-0.5 h-9 w-9 rounded-xl border border-black/10"
                style={{ background: step.color.hex }}
                aria-hidden
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <p className="truncate text-[12px] font-bold">
                    {step.label}: {colorName}
                  </p>
                  <span className="text-[11px] font-semibold text-[var(--ink-soft)]">about {coverage}%</span>
                </div>
                <p className="mt-0.5 text-[11px] font-semibold text-[var(--accent)]">
                  {step.color.hex.toUpperCase()}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--ink-soft)]">{step.tip}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function PaintKit() {
  const myPaints = useMyPaints();
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-[20px] border border-[var(--line)] bg-[var(--card-2)] p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--accent)]">Your physical kit</p>
        <h3 className="mt-1 text-[17px] font-bold">Recipes built from paints you own</h3>
        <p className="mt-1 text-[12px] leading-relaxed text-[var(--ink-soft)]">
          Huely currently has {myPaints.length} tubes available. Remove paints you do not own and add custom colors from your own brand.
        </p>
      </div>
      <MyPaintsEditor />
    </div>
  );
}
