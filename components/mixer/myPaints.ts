"use client";

import { useSyncExternalStore } from "react";
import { BASE_PAINTS, type Paint } from "@/lib/image/recipes";

/**
 * The painter's own set of tubes, persisted on-device (localStorage). The mixer
 * solves recipes against this set so you only ever get colors you can actually
 * mix. Defaults to a basic starter palette until customized.
 */
const KEY = "huely-paints";

function load(): Paint[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed as Paint[];
    }
  } catch {
    // no localStorage (SSR) or bad data → defaults
  }
  return BASE_PAINTS;
}

let paints: Paint[] = load();
const listeners = new Set<() => void>();

export function getMyPaints(): Paint[] {
  return paints;
}

export function setMyPaints(next: Paint[]): void {
  paints = next.length ? next : BASE_PAINTS;
  try {
    localStorage.setItem(KEY, JSON.stringify(paints));
  } catch {
    // best effort
  }
  listeners.forEach((l) => l());
}

export function togglePaint(paint: Paint): void {
  const has = paints.some((p) => p.name === paint.name);
  setMyPaints(has ? paints.filter((p) => p.name !== paint.name) : [...paints, paint]);
}

export function resetMyPaints(): void {
  setMyPaints(BASE_PAINTS);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useMyPaints(): Paint[] {
  return useSyncExternalStore(subscribe, () => paints, () => BASE_PAINTS);
}
