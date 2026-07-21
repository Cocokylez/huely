"use client";

import { hexToRgb } from "@/lib/image/color";
import { nearestName } from "@/lib/image/colorNames";
import { useMixer } from "@/components/mixer/MixerProvider";
import { useToast } from "@/components/ui/ToastProvider";

export function SampleReadout({ hex }: { hex: string }) {
  const { addColor } = useMixer();
  const { toast } = useToast();
  const [r, g, b] = hexToRgb(hex);

  return (
    <div className="mt-3.5 flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-2.5">
      <span
        className="h-10 w-10 flex-none rounded-lg border border-black/10"
        style={{ background: hex }}
      />
      <div className="min-w-0 flex-1 leading-tight">
        <strong className="font-mono text-base">{hex}</strong>
        <small className="block text-neutral-500">
          {nearestName(r, g, b)} · rgb({r}, {g}, {b})
        </small>
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={() => addColor(hex)}
          className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-semibold hover:border-neutral-500"
        >
          + Mixer
        </button>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(hex);
            toast(`Copied ${hex}`);
          }}
          className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-semibold hover:border-neutral-500"
        >
          Copy
        </button>
      </div>
    </div>
  );
}
