"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

interface ToastCtx {
  toast: (message: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((msg: string) => {
    setMessage(msg);
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 1600);
  }, []);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed left-1/2 z-50 -translate-x-1/2 rounded-full bg-[var(--ink)] px-4 py-2 text-[13px] text-[var(--paper)] shadow-[var(--shadow)] transition-all duration-200 ${
          visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        style={{ bottom: "calc(7.25rem + env(safe-area-inset-bottom))" }}
      >
        {message}
      </div>
    </Ctx.Provider>
  );
}
