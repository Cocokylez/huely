"use client";

import { hexToRgb } from "@/lib/image/color";
import { nearestName } from "@/lib/image/colorNames";
import { useMixer } from "@/components/mixer/MixerProvider";
import { useToast } from "@/components/ui/ToastProvider";

const chip =
  "rounded-full border border-[var(--line)] bg-[var(--paper-2)] px-3 py-1.5 text-[12px] font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-95";

/** Eyedropper readout (spec 03 · Result). */
export function SampleReadout({ hex }: { hex: string }) {
  const { addColor } = useMixer();
  const { toast } = useToast();
  const [r, g, b] = hexToRgb(hex);

  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--card)] p-2.5">
      <span
        className="h-10 w-10 flex-none rounded-[10px] border border-black/10"
        style={{ background: hex }}
      />
      <div className="min-w-0 flex-1 leading-tight">
        <b className="text-[14px]" style={{ fontFamily: "var(--mono)" }}>
          {hex}
        </b>
        <small className="block text-[12px] text-[var(--ink-soft)]">
          {nearestName(r, g, b)} · rgb({r}, {g}, {b})
        </small>
      </div>
      <div className="flex flex-none gap-1.5">
        <button onClick={() => addColor(hex)} className={chip}>
          + Mixer
        </button>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(hex);
            toast(`Copied ${hex}`);
          }}
          className={chip}
        >
          Copy
        </button>
      </div>
    </div>
  );
}
