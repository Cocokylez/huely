"use client";

import { useEffect, useMemo, useState } from "react";
import { useMixer } from "./MixerProvider";
import { useMixSource } from "./mixSource";
import { useToast } from "@/components/ui/ToastProvider";
import { nearestName } from "@/lib/image/colorNames";
import { hexToRgb, rgbToHex } from "@/lib/image/color";
import { parseColorInput, solveRecipe } from "@/lib/image/recipes";

/**
 * Color Mixer — bottom sheet on mobile, 380px right side panel on ≥900px
 * (spec 02 · Toast & sheet; spec 03 · Mixer).
 */
export function Mixer() {
  const { slots, open, result, closeMixer, removeSlot, setHex, setParts, addColor, clear } =
    useMixer();
  const { toast } = useToast();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) closeMixer();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closeMixer]);

  if (!open) return null;

  const copyResult = () => {
    if (!result) return;
    navigator.clipboard?.writeText(result.hex);
    toast(`Copied ${result.hex}`);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center min-[900px]:items-stretch min-[900px]:justify-end">
      <div
        className="absolute inset-0 bg-[rgba(30,22,14,0.45)]"
        style={{ animation: "fade 0.2s ease" }}
        onClick={closeMixer}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Color mixer"
        className="relative flex max-h-[90dvh] w-full flex-col gap-4 overflow-y-auto rounded-t-[22px] bg-[var(--paper)] p-5 pb-8 shadow-[0_-12px_40px_rgba(0,0,0,0.25)] min-[900px]:m-0 min-[900px]:max-h-none min-[900px]:w-[380px] min-[900px]:rounded-none min-[900px]:border-l min-[900px]:border-[var(--line)] min-[900px]:pb-5"
        style={{ animation: "sheet-up 0.28s cubic-bezier(0.2,0.8,0.2,1)" }}
      >
        <div className="mx-auto h-1 w-9 rounded-full bg-[var(--line)] min-[900px]:hidden" aria-hidden />

        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[21px] font-bold tracking-tight">Color Mixer</h2>
            <p className="text-[13px] text-[var(--ink-soft)]">
              Blend like real pigment. Name any shade.
            </p>
          </div>
          <button
            onClick={closeMixer}
            aria-label="Close"
            className="grid h-[34px] w-[34px] place-items-center rounded-full border border-[var(--line)] bg-[var(--card)] text-[var(--ink-soft)] hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-95"
          >
            ✕
          </button>
        </div>

        <MatchColor />

        {/* Result */}
        <div className="flex items-center gap-3.5 rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-3.5">
          <div
            className="h-[62px] w-[62px] flex-none rounded-xl border border-black/10"
            style={{
              background: result?.hex ?? "var(--paper-2)",
              boxShadow: "inset 0 0 0 3px rgba(255,255,255,0.25)",
            }}
          />
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-bold">{result?.name ?? "Add colors to mix"}</div>
            <div className="text-[13px] text-[var(--ink-soft)]" style={{ fontFamily: "var(--mono)" }}>
              {result
                ? `${result.hex} · rgb(${result.rgb[0]}, ${result.rgb[1]}, ${result.rgb[2]})`
                : "—"}
            </div>
          </div>
          <button
            onClick={copyResult}
            disabled={!result}
            className="rounded-full border border-[var(--line)] bg-[var(--paper-2)] px-3 py-1.5 text-[13px] font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-95 disabled:opacity-45"
          >
            Copy
          </button>
        </div>

        {/* Slots */}
        <div className="flex flex-col gap-2">
          {slots.map((s, i) => {
            const [r, g, b] = hexToRgb(s.hex);
            return (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--card)] p-2.5"
              >
                <label className="relative h-10 w-10 flex-none cursor-pointer">
                  <span
                    className="block h-full w-full rounded-[10px] border border-black/10"
                    style={{ background: s.hex }}
                  />
                  <input
                    type="color"
                    value={s.hex}
                    onChange={(e) => setHex(i, e.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label="Change color"
                  />
                </label>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="text-[13px]" style={{ fontFamily: "var(--mono)" }}>
                    {s.hex.toUpperCase()}
                  </div>
                  <div className="text-[12px] text-[var(--ink-soft)]">{nearestName(r, g, b)}</div>
                </div>
                <div className="flex items-center gap-0.5 rounded-full bg-[var(--paper-2)] p-1">
                  <button
                    onClick={() => setParts(i, s.parts - 1)}
                    aria-label="Fewer parts"
                    className="grid h-7 w-7 place-items-center rounded-full text-[15px] font-bold hover:bg-[var(--card-2)] hover:text-[var(--accent)]"
                  >
                    −
                  </button>
                  <span className="min-w-5 text-center text-[13px] font-bold">{s.parts}</span>
                  <button
                    onClick={() => setParts(i, s.parts + 1)}
                    aria-label="More parts"
                    className="grid h-7 w-7 place-items-center rounded-full text-[15px] font-bold hover:bg-[var(--card-2)] hover:text-[var(--accent)]"
                  >
                    ＋
                  </button>
                </div>
                <button
                  onClick={() => removeSlot(i)}
                  aria-label="Remove color"
                  className="grid h-7 w-7 flex-none place-items-center rounded-full text-[13px] text-[var(--ink-soft)] hover:text-[var(--accent)]"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => addColor(slots[0]?.hex ?? "#7f7f7f")}
            className="flex-1 rounded-xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 text-[13px] font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-[0.98]"
          >
            + Add a color
          </button>
          <button
            onClick={clear}
            className="flex-1 rounded-xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 text-[13px] font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-[0.98]"
          >
            Clear
          </button>
        </div>

        <MixSourceChips />

        <p className="text-[12px] leading-relaxed text-[var(--ink-soft)]">
          Mixing is subtractive, like real pigment — blue + yellow makes green. Use − / ＋ to change
          how many parts of each color go in.
        </p>
      </div>
    </div>
  );
}

const QUALITY_COPY = {
  "spot-on": "Spot on — this mix hits your color.",
  close: "Close match — tweak parts to taste.",
  closest: "Closest possible mix from a basic paint set.",
} as const;

/** "Match a color" — paste any color, get the paint recipe to mix it. */
function MatchColor() {
  const { target, setTarget, loadSlots } = useMixer();
  const { toast } = useToast();
  const [raw, setRaw] = useState("");

  // A target pushed from outside (eyedropper "Recipe" button) fills the field.
  useEffect(() => {
    if (target) setRaw(target);
  }, [target]);

  const parsed = useMemo(() => parseColorInput(raw), [raw]);
  const recipe = useMemo(() => (parsed ? solveRecipe(parsed) : null), [parsed]);
  const targetHex = parsed ? rgbToHex(parsed[0], parsed[1], parsed[2]).toUpperCase() : null;

  const useMix = () => {
    if (!recipe) return;
    loadSlots(recipe.parts.map((p) => ({ hex: p.paint.hex, parts: p.parts })));
    toast("Recipe loaded into the mixer");
  };

  return (
    <div className="rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-3.5">
      <p className="mb-0.5 text-[15px] font-bold">Match a color</p>
      <p className="mb-2.5 text-[12px] text-[var(--ink-soft)]">
        Paste a color to find out what paints to mix.
      </p>

      <div className="flex items-center gap-2">
        <input
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value);
            if (!e.target.value) setTarget(null);
          }}
          placeholder="#5A7A52 or rgb(90, 122, 82)"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[var(--card-2)] px-3.5 py-2.5 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          style={{ fontFamily: "var(--mono)" }}
          aria-label="Target color"
        />
        <label
          className="relative h-[42px] w-[42px] flex-none cursor-pointer rounded-xl border border-[var(--line)]"
          style={{ background: targetHex ?? "var(--paper-2)" }}
          title="Pick a color"
        >
          <input
            type="color"
            value={targetHex ?? "#808080"}
            onChange={(e) => setRaw(e.target.value.toUpperCase())}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Pick target color"
          />
        </label>
      </div>

      {raw && !parsed && (
        <p className="mt-2 text-[12px] text-[var(--accent)]">
          That doesn&apos;t look like a color — try #RRGGBB.
        </p>
      )}

      {recipe && targetHex && (
        <div className="mt-3">
          <div className="flex items-center gap-3">
            <div className="flex flex-none flex-col items-center gap-1">
              <span
                className="h-[46px] w-[46px] rounded-[10px] border border-black/10"
                style={{ background: targetHex }}
              />
              <span className="text-[10px] text-[var(--ink-soft)]">target</span>
            </div>
            <span className="text-[15px] text-[var(--ink-soft)]" aria-hidden>
              →
            </span>
            <div className="flex flex-none flex-col items-center gap-1">
              <span
                className="h-[46px] w-[46px] rounded-[10px] border border-black/10"
                style={{ background: recipe.hex }}
              />
              <span className="text-[10px] text-[var(--ink-soft)]">your mix</span>
            </div>
            <div className="min-w-0 flex-1">
              {recipe.parts.map((p) => (
                <div key={p.paint.name} className="flex items-center gap-2 py-0.5">
                  <span
                    className="h-4 w-4 flex-none rounded border border-black/10"
                    style={{ background: p.paint.hex }}
                  />
                  <span className="truncate text-[13px]">
                    <b>{p.parts}</b> × {p.paint.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="text-[12px] text-[var(--ink-soft)]">{QUALITY_COPY[recipe.quality]}</span>
            <button
              onClick={useMix}
              className="flex-none rounded-full border border-[var(--line)] bg-[var(--paper-2)] px-3 py-1.5 text-[12px] font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-95"
            >
              Use this mix
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** "From your palette" chips — fed by the studio via the mixSource store. */
function MixSourceChips() {
  const { addColor } = useMixer();
  const palette = useMixSource();
  if (!palette.length) return null;
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink-soft)]">
        From your palette
      </p>
      <div className="flex flex-wrap gap-2">
        {palette.map((c, i) => (
          <button
            key={`${c.hex}-${i}`}
            onClick={() => addColor(c.hex)}
            title={`Add ${c.hex.toUpperCase()} to mix`}
            className="h-[30px] w-[30px] rounded-lg border border-[var(--line)] transition hover:scale-110"
            style={{ background: c.hex }}
          />
        ))}
      </div>
    </div>
  );
}
