"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

interface CreateDraft {
  id: string;
  file: File;
}

interface CreateContextValue {
  open: boolean;
  openCreate: () => void;
  closeCreate: () => void;
  draft: CreateDraft | null;
  consumeDraft: (id: string) => void;
}

const CreateContext = createContext<CreateContextValue | null>(null);

export function useCreateFlow() {
  const context = useContext(CreateContext);
  if (!context) throw new Error("useCreateFlow must be used within CreateProvider");
  return context;
}

export function CreateProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CreateDraft | null>(null);

  const openCreate = useCallback(() => setOpen(true), []);
  const closeCreate = useCallback(() => setOpen(false), []);
  const consumeDraft = useCallback((id: string) => {
    setDraft((current) => (current?.id === id ? null : current));
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCreate();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [closeCreate, open]);

  const begin = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setDraft({
      id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${file.name}`,
      file,
    });
    setOpen(false);
    router.push("/create");
  };

  const value = useMemo(
    () => ({ open, openCreate, closeCreate, draft, consumeDraft }),
    [open, openCreate, closeCreate, draft, consumeDraft],
  );

  return (
    <CreateContext.Provider value={value}>
      {children}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) begin(file);
          event.target.value = "";
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) begin(file);
          event.target.value = "";
        }}
      />

      {open && (
        <div className="fixed inset-0 z-[65] flex items-end justify-center p-2 sm:items-center sm:p-4">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close new project"
            className="absolute inset-0 bg-[rgba(30,22,14,0.48)] backdrop-blur-[2px]"
            onClick={closeCreate}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-project-title"
            className="relative w-full max-w-md rounded-[24px] border border-[var(--line)] bg-[var(--card-2)] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.32)]"
            style={{
              paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
              animation: "sheet-up 0.24s cubic-bezier(0.2,0.8,0.2,1)",
            }}
          >
            <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-[var(--line)] sm:hidden" aria-hidden />
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-[var(--accent)] text-white">
                <Icon name="plus" size={22} strokeWidth={2.2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--accent)]">
                  New project
                </p>
                <h2 id="new-project-title" className="text-[20px] font-extrabold tracking-[-0.025em]">
                  Choose your reference
                </h2>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--ink-soft)]">
                  Huely processes the photo privately on this device, then opens the painting workspace.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreate}
                aria-label="Close new project"
                className="grid h-9 w-9 flex-none place-items-center rounded-full border border-[var(--line)] bg-[var(--card)] text-[var(--ink-soft)]"
              >
                <Icon name="x" size={15} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                autoFocus
                onClick={() => cameraRef.current?.click()}
                className="flex min-h-[122px] flex-col items-center justify-center gap-2 rounded-[18px] bg-[var(--ink)] px-3 py-4 text-center text-[var(--paper)] shadow-[var(--shadow-sm)] active:scale-[0.98]"
              >
                <Icon name="camera" size={25} />
                <span>
                  <b className="block text-[13px]">Take a photo</b>
                  <span className="mt-0.5 block text-[9px] opacity-70">Open the rear camera</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className="flex min-h-[122px] flex-col items-center justify-center gap-2 rounded-[18px] border border-[var(--line)] bg-[var(--card)] px-3 py-4 text-center text-[var(--ink)] shadow-[var(--shadow-sm)] active:scale-[0.98]"
              >
                <Icon name="image" size={25} className="text-[var(--accent)]" />
                <span>
                  <b className="block text-[13px]">Choose a photo</b>
                  <span className="mt-0.5 block text-[9px] text-[var(--ink-soft)]">Gallery or files</span>
                </span>
              </button>
            </div>

            <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-[var(--ink-soft)]">
              <Icon name="check" size={12} className="text-[var(--accent-2)]" /> Original photos are never uploaded
            </p>
          </section>
        </div>
      )}
    </CreateContext.Provider>
  );
}
