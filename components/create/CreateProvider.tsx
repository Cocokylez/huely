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

      <div
        aria-hidden={!open}
        className={`fixed inset-0 z-40 flex items-end justify-center px-3 pt-3 transition-opacity duration-150 will-change-[opacity] ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ paddingBottom: "calc(7.25rem + env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          tabIndex={-1}
          disabled={!open}
          aria-label="Close new project"
          className="absolute inset-0 bg-[rgba(30,22,14,0.42)] backdrop-blur-[3px]"
          onClick={closeCreate}
        />
        <section
          role="dialog"
          aria-labelledby="new-project-title"
          className={`relative w-full max-w-sm origin-bottom rounded-[20px] border border-[var(--line)] bg-[var(--card-2)] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.26)] transition-[transform,opacity] duration-200 ease-out will-change-[transform,opacity] ${
            open ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.98] opacity-0"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <h2 id="new-project-title" className="text-[18px] font-bold tracking-[-0.015em]">
                New project
              </h2>
              <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">Choose a reference photo</p>
            </div>
            <button
              type="button"
              disabled={!open}
              onClick={closeCreate}
              aria-label="Close new project"
              className="grid h-9 w-9 flex-none place-items-center rounded-full border border-[var(--line)] text-[var(--ink-soft)] transition hover:bg-[var(--paper-2)] hover:text-[var(--ink)]"
            >
              <Icon name="x" size={15} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={!open}
              onClick={() => cameraRef.current?.click()}
              className="flex min-h-[94px] flex-col items-center justify-center gap-2 rounded-[16px] border border-[color-mix(in_srgb,var(--accent)_42%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_8%,var(--card))] px-3 py-4 text-center text-[var(--ink)] transition hover:border-[var(--accent)] active:scale-[0.98]"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--accent)] text-white">
                <Icon name="camera" size={19} />
              </span>
              <b className="text-[13px]">Take photo</b>
            </button>
            <button
              type="button"
              disabled={!open}
              onClick={() => galleryRef.current?.click()}
              className="flex min-h-[94px] flex-col items-center justify-center gap-2 rounded-[16px] border border-[var(--line)] bg-[var(--card)] px-3 py-4 text-center text-[var(--ink)] transition hover:border-[var(--accent)] active:scale-[0.98]"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--paper-2)] text-[var(--accent)]">
                <Icon name="image" size={19} />
              </span>
              <b className="text-[13px]">Photo library</b>
            </button>
          </div>
        </section>
      </div>
    </CreateContext.Provider>
  );
}
