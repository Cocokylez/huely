import type { ImageQuality, ResolvedImageQuality } from "./types";

export interface ImageQualityProfile {
  id: ResolvedImageQuality;
  label: string;
  workMax: number;
  referenceMax: number;
}

export const IMAGE_QUALITY_OPTIONS: { id: ImageQuality; label: string; description: string }[] = [
  { id: "auto", label: "Auto", description: "Chooses the safest detail for this device" },
  { id: "fast", label: "Fast", description: "Quickest processing · lighter storage" },
  { id: "balanced", label: "Balanced", description: "Sharper zoom with practical speed" },
  { id: "detailed", label: "Detailed", description: "Sharpest zoom · slower on phones" },
];

const PROFILES: Record<ResolvedImageQuality, ImageQualityProfile> = {
  fast: { id: "fast", label: "Fast", workMax: 960, referenceMax: 1600 },
  balanced: { id: "balanced", label: "Balanced", workMax: 1440, referenceMax: 2560 },
  detailed: { id: "detailed", label: "Detailed", workMax: 2048, referenceMax: 3200 },
};

/** Resolve Auto conservatively: Detailed only on devices that clearly report ample resources. */
export function resolveImageQuality(quality: ImageQuality): ImageQualityProfile {
  if (quality !== "auto") return PROFILES[quality];
  if (typeof navigator === "undefined") return PROFILES.balanced;

  const device = navigator as Navigator & { deviceMemory?: number };
  const memory = device.deviceMemory;
  const cores = device.hardwareConcurrency || 4;

  if ((memory != null && memory <= 4) || cores <= 4) return PROFILES.fast;
  if (memory != null && memory >= 8 && cores >= 8) return PROFILES.detailed;
  return PROFILES.balanced;
}

export function isImageQuality(value: string | null): value is ImageQuality {
  return value === "auto" || value === "fast" || value === "balanced" || value === "detailed";
}
