"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { mixPaints } from "@/lib/image/mixer";
import { nearestName } from "@/lib/image/colorNames";
import { rgbToHex } from "@/lib/image/color";
import { MAX_MIX_SLOTS } from "@/lib/image/constants";
import type { MixSlot } from "@/lib/image/types";

export interface MixerResult {
  hex: string;
  rgb: [number, number, number];
  name: string;
}

interface MixerCtx {
  slots: MixSlot[];
  open: boolean;
  result: MixerResult | null;
  openMixer: () => void;
  closeMixer: () => void;
  addColor: (hex: string) => void;
  removeSlot: (index: number) => void;
  setHex: (index: number, hex: string) => void;
  setParts: (index: number, parts: number) => void;
  clear: () => void;
}

const Ctx = createContext<MixerCtx | null>(null);

export function useMixer() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMixer must be used within MixerProvider");
  return ctx;
}

export function MixerProvider({ children }: { children: React.ReactNode }) {
  const [slots, setSlots] = useState<MixSlot[]>([]);
  const [open, setOpen] = useState(false);

  const openMixer = useCallback(() => {
    setSlots((prev) =>
      prev.length > 0
        ? prev
        : [
            { hex: "#1f57c3", parts: 1 },
            { hex: "#ffd700", parts: 1 },
          ],
    );
    setOpen(true);
  }, []);

  const closeMixer = useCallback(() => setOpen(false), []);

  const addColor = useCallback((hex: string) => {
    setSlots((prev) => (prev.length >= MAX_MIX_SLOTS ? prev : [...prev, { hex, parts: 1 }]));
    setOpen(true);
  }, []);

  const removeSlot = useCallback(
    (index: number) => setSlots((prev) => prev.filter((_, i) => i !== index)),
    [],
  );

  const setHex = useCallback(
    (index: number, hex: string) =>
      setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, hex } : s))),
    [],
  );

  const setParts = useCallback(
    (index: number, parts: number) =>
      setSlots((prev) =>
        prev.map((s, i) => (i === index ? { ...s, parts: Math.max(1, Math.min(9, parts)) } : s)),
      ),
    [],
  );

  const clear = useCallback(() => setSlots([]), []);

  const result = useMemo<MixerResult | null>(() => {
    const rgb = mixPaints(slots);
    if (!rgb) return null;
    const [r, g, b] = rgb;
    return { hex: rgbToHex(r, g, b).toUpperCase(), rgb, name: nearestName(r, g, b) };
  }, [slots]);

  const value = useMemo(
    () => ({
      slots,
      open,
      result,
      openMixer,
      closeMixer,
      addColor,
      removeSlot,
      setHex,
      setParts,
      clear,
    }),
    [slots, open, result, openMixer, closeMixer, addColor, removeSlot, setHex, setParts, clear],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
