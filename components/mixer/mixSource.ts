"use client";

import { useSyncExternalStore } from "react";
import type { PaletteColor } from "@/lib/image/types";
import type { PaintStep } from "@/lib/image/paintingSteps";

/**
 * Tiny external store: the studio publishes its current palette here so the
 * Mixer (which lives in the layout) can show "From your palette" chips.
 */
let palette: PaletteColor[] = [];
let paintOrder: PaintStep[] = [];
const listeners = new Set<() => void>();

export function setMixSource(next: PaletteColor[], nextPaintOrder: PaintStep[] = []) {
  palette = next;
  paintOrder = nextPaintOrder;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useMixSource(): PaletteColor[] {
  return useSyncExternalStore(subscribe, () => palette, () => palette);
}

export function usePaintOrderSource(): PaintStep[] {
  return useSyncExternalStore(subscribe, () => paintOrder, () => paintOrder);
}
