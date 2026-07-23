import { Icon, type IconName } from "@/components/ui/Icon";

const METHOD: { title: string; body: string; icon: IconName }[] = [
  {
    title: "Simplify the reference",
    body: "Start in Oil view to see the large shapes. Use Original only when a small edge or detail needs clarification.",
    icon: "image",
  },
  {
    title: "Transfer the big shapes",
    body: "Use the grid or center guides to place the subject. Check proportions before committing to details.",
    icon: "grid",
  },
  {
    title: "Block in the largest color",
    body: "Cover the broad base area loosely first. It gives every shadow, mid-tone, and highlight somewhere to belong.",
    icon: "brush",
  },
  {
    title: "Build dark to light",
    body: "Place the shadows next, shape the mid-tones, and keep the cleanest lights until the end.",
    icon: "value",
  },
  {
    title: "Compare, adjust, finish",
    body: "Photograph the canvas, use Split or Overlay, then correct the largest difference before adding tiny accents.",
    icon: "compare",
  },
];

const LESSONS = [
  {
    title: "Mixing a target color",
    body: "Open Paint Lab, paste or choose the target, and begin with Huely's suggested parts. Mix a small test dab. If it is too dark, add light paint gradually; if too dull, add a little of the stronger color rather than more of everything.",
  },
  {
    title: "Creating depth",
    body: "Depth comes mainly from value relationships. Establish the dark shape first, then place a related mid-tone beside it. Add a cooler or softer color as forms move away, and reserve sharp light-dark edges for the focal area.",
  },
  {
    title: "Knowing when a color is done",
    body: "Step back from the canvas. If the color has the right lightness, covers the intended shape, and supports nearby colors, mark it complete. Exact hue matters less than the overall light-dark structure.",
  },
  {
    title: "Using a canvas photo well",
    body: "Photograph both canvas and reference in even light, as straight-on as possible. Split view reveals drawing shifts; Overlay reveals size and alignment; Side by side is best for judging color and finish.",
  },
];

export default function GuidePage() {
  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-[24px] border border-[var(--line)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)]">
        <span className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[var(--accent-soft)] opacity-35 blur-3xl" aria-hidden />
        <div className="relative">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--accent)]">
            <Icon name="book" size={13} /> Beginner guide
          </p>
          <h1 className="max-w-[13ch] text-[32px] font-extrabold leading-[1.02] tracking-[-0.04em]">
            A calmer way to start painting.
          </h1>
          <p className="mt-3 max-w-[43ch] text-[12px] leading-relaxed text-[var(--ink-soft)]">
            Huely removes the blank-canvas guesswork. Follow the project’s own painting order, work from large shapes to small accents, and correct one clear difference at a time.
          </p>
        </div>
      </header>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[var(--accent)]">The Huely method</p>
            <h2 className="mt-0.5 text-[19px] font-extrabold">Five stages, in order</h2>
          </div>
          <span className="text-[10px] text-[var(--ink-soft)]">Use this for every project</span>
        </div>
        <ol className="grid gap-2.5">
          {METHOD.map((step, index) => (
            <li key={step.title} className="grid grid-cols-[34px_38px_1fr] items-start gap-2.5 rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-3 shadow-[var(--shadow-sm)]">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--ink)] text-[11px] font-extrabold text-[var(--paper)]">
                {index + 1}
              </span>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--paper-2)] text-[var(--accent)]">
                <Icon name={step.icon} size={17} />
              </span>
              <div>
                <h3 className="text-[13px] font-bold">{step.title}</h3>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--ink-soft)]">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[var(--accent)]">Quick lessons</p>
        <h2 className="mb-3 mt-0.5 text-[19px] font-extrabold">When you feel stuck</h2>
        <div className="grid gap-2.5">
          {LESSONS.map((lesson, index) => (
            <details key={lesson.title} className="group rounded-[16px] border border-[var(--line)] bg-[var(--card)] shadow-[var(--shadow-sm)]">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-3.5 py-3.5">
                <span className="grid h-8 w-8 flex-none place-items-center rounded-xl bg-[var(--paper-2)] text-[11px] font-extrabold text-[var(--accent)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 text-[13px] font-bold">{lesson.title}</span>
                <Icon name="chevronDown" size={15} className="text-[var(--ink-soft)] transition group-open:rotate-180" />
              </summary>
              <p className="border-t border-[var(--line)] px-4 py-3 text-[11px] leading-relaxed text-[var(--ink-soft)]">
                {lesson.body}
              </p>
            </details>
          ))}
        </div>
      </section>

      <div className="rounded-[18px] border border-[var(--line)] bg-[var(--paper-2)] p-4 text-center">
        <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-[var(--accent)] text-white">
          <Icon name="plus" size={18} />
        </span>
        <h2 className="mt-2 text-[14px] font-bold">Ready to practice?</h2>
        <p className="mt-1 text-[11px] text-[var(--ink-soft)]">Tap the center plus button below and choose a reference.</p>
      </div>
    </div>
  );
}
