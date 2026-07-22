import type { PaletteColor } from "./types";
import { luminance } from "./color";

export type StepRole = "base" | "shadow" | "midtone" | "highlight" | "detail";

export interface PaintStep {
  /** Palette index this step paints. */
  index: number;
  color: PaletteColor;
  /** Share of the picture this color covers, 0..1. */
  coverage: number;
  role: StepRole;
  label: string;
  tip: string;
}

const ROLE_LABEL: Record<StepRole, string> = {
  base: "Block in",
  shadow: "Darks",
  midtone: "Mid-tones",
  highlight: "Lights",
  detail: "Accents",
};

const ROLE_TIP: Record<StepRole, string> = {
  base: "Start with the biggest area — it's the ground everything else sits on. Cover it loosely; don't fuss.",
  shadow: "Lay the darks in next. They create depth and make everything painted after them look brighter.",
  midtone: "Build the mid-tones. Most of the form lives here, so take your time shaping edges.",
  highlight: "Save the lightest colors for last so they stay clean and bright — dirty highlights kill a painting.",
  detail: "Small accents to finish. A little goes a long way; step back before adding more.",
};

const DETAIL_COVERAGE = 0.03; // under 3% of the picture = a finishing accent
const DARK = 85;
const LIGHT = 175;

/**
 * Turn a palette into a beginner-friendly painting order.
 *
 * The sequence follows how painters actually work in opaque media: block in
 * the largest area first, then work dark → light (darks build depth, lights
 * stay clean), and finish with small accents.
 */
export function buildPaintingSteps(
  palette: PaletteColor[],
  index: Uint8Array,
): PaintStep[] {
  if (!palette.length) return [];

  const counts = new Array(palette.length).fill(0);
  for (let p = 0; p < index.length; p++) {
    const i = index[p];
    if (i < counts.length) counts[i]++;
  }
  const total = index.length || 1;

  const items = palette.map((color, i) => ({
    index: i,
    color,
    coverage: counts[i] / total,
    lum: luminance(color),
  }));

  // The biggest area gets blocked in first.
  const base = items.reduce((a, b) => (b.coverage > a.coverage ? b : a));

  const rest = items
    .filter((it) => it.index !== base.index)
    .sort((a, b) => {
      const aDetail = a.coverage < DETAIL_COVERAGE ? 1 : 0;
      const bDetail = b.coverage < DETAIL_COVERAGE ? 1 : 0;
      if (aDetail !== bDetail) return aDetail - bDetail; // accents last
      return a.lum - b.lum; // otherwise dark → light
    });

  return [base, ...rest].map((it, order) => {
    let role: StepRole;
    if (order === 0) role = "base";
    else if (it.coverage < DETAIL_COVERAGE) role = "detail";
    else if (it.lum < DARK) role = "shadow";
    else if (it.lum > LIGHT) role = "highlight";
    else role = "midtone";

    return {
      index: it.index,
      color: it.color,
      coverage: it.coverage,
      role,
      label: ROLE_LABEL[role],
      tip: ROLE_TIP[role],
    };
  });
}
