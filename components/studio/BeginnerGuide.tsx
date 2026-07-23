"use client";

import { useCallback, useEffect, useRef } from "react";

const STORAGE_KEY = "huely-beginner-guide-seen";

export function shouldShowBeginnerGuide(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "1";
  } catch {
    return true;
  }
}

function rememberGuide() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // The guide can still close when private storage is unavailable.
  }
}

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenWorkspace: () => void;
}

const STEPS = [
  {
    title: "See the big shapes",
    body: "Begin with Oil paint. Switch to Original only when you need small details, or By numbers when you want clear regions.",
  },
  {
    title: "Paint in Huely's order",
    body: "Follow How to paint this from top to bottom: broad base colors first, then shadows, then the light accents.",
  },
  {
    title: "Mix, locate, finish",
    body: "Use the shown part ratios, tap Show me where, test a small dab, and mark the color done before moving on.",
  },
];

export function BeginnerGuide({ open, onClose, onOpenWorkspace }: Props) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const restoreFocusRef = useRef(true);

  const close = useCallback(() => {
    rememberGuide();
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    restoreFocusRef.current = true;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      if (restoreFocusRef.current) previousFocusRef.current?.focus();
    };
  }, [close, open]);

  if (!open) return null;

  const startWorkspace = () => {
    rememberGuide();
    restoreFocusRef.current = false;
    onClose();
    onOpenWorkspace();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close beginner guide"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={close}
      />
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="beginner-guide-title"
        aria-describedby="beginner-guide-description"
        className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-[22px] border border-[var(--line)] bg-[var(--card-2)] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.3)]"
      >
        <div className="flex items-start gap-3">
          <span
            className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-[var(--accent)] text-[19px] font-black text-white"
            aria-hidden
          >
            H
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
              60-second start
            </p>
            <h2 id="beginner-guide-title" className="text-[20px] font-extrabold leading-tight">
              Your first painting, made simpler
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Close beginner guide"
            className="grid h-9 w-9 flex-none place-items-center rounded-full border border-[var(--line)] bg-[var(--paper-2)] text-[14px] text-[var(--ink-soft)]"
          >
            ✕
          </button>
        </div>

        <p id="beginner-guide-description" className="mt-3 text-[13px] leading-relaxed text-[var(--ink-soft)]">
          Huely has already simplified the reference and sorted its colors. Use this order instead of wondering where to begin.
        </p>

        <ol className="mt-4 grid gap-2.5">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3 rounded-2xl bg-[var(--paper-2)] p-3">
              <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-[var(--ink)] text-[12px] font-bold text-[var(--paper)]">
                {index + 1}
              </span>
              <div>
                <b className="block text-[13px]">{step.title}</b>
                <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--ink-soft)]">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-3 rounded-xl border border-[var(--line)] px-3 py-2.5 text-[12px] leading-relaxed text-[var(--ink-soft)]">
          <b className="text-[var(--ink)]">Beginner tip:</b> match light and dark first. Tiny hue differences matter less than getting the value right.
        </p>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={close}
            className="flex-1 rounded-xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 text-[13px] font-semibold text-[var(--ink-soft)]"
          >
            Keep exploring
          </button>
          <button
            type="button"
            onClick={startWorkspace}
            className="flex-1 rounded-xl bg-[var(--accent)] px-4 py-3 text-[13px] font-semibold text-white active:scale-[0.98]"
          >
            Open workspace
          </button>
        </div>
      </section>
    </div>
  );
}
