"use client";

import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "huely-install-dismissed";
const DISMISS_FOR = 7 * 24 * 60 * 60 * 1000;

function isStandalone() {
  const iosNavigator = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || iosNavigator.standalone === true;
}

function dismissedRecently(): boolean {
  try {
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    return Date.now() - dismissedAt < DISMISS_FOR;
  } catch {
    return false;
  }
}

function rememberDismissal() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Dismiss for this page view when local storage is unavailable.
  }
}

export function PwaInstallPrompt() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((registration) => registration.update()).catch(() => {});
    }

    const recentlyDismissed = dismissedRecently();
    const ios =
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (!recentlyDismissed && ios && !isStandalone()) setShowIosHelp(true);

    const handlePrompt = (event: Event) => {
      event.preventDefault();
      if (!recentlyDismissed && !isStandalone()) setPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setPrompt(null);
      setShowIosHelp(false);
    };
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const dismiss = () => {
    rememberDismissal();
    setPrompt(null);
    setShowIosHelp(false);
  };

  const install = async () => {
    if (!prompt) return;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "dismissed") rememberDismissal();
      setPrompt(null);
    } catch {
      // Keep the suggestion available if the browser could not open its prompt.
    }
  };

  if (!online) {
    return (
      <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full border border-[var(--line)] bg-[var(--ink)] px-4 py-2 text-center text-[11px] font-semibold text-[var(--paper)] shadow-[var(--shadow)]">
        Offline · photos still process on this device
      </div>
    );
  }

  if (!prompt && !showIosHelp) return null;

  return (
    <aside className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--card-2)] p-3 shadow-[var(--shadow)]">
      <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-[var(--accent)] text-[16px] font-black text-white" aria-hidden>
        H
      </span>
      <div className="min-w-0 flex-1">
        <b className="block text-[13px]">Install Huely</b>
        <p className="text-[10px] leading-relaxed text-[var(--ink-soft)]">
          {showIosHelp ? "Tap Share, then Add to Home Screen." : "Open like an app and keep the painting tools ready offline."}
        </p>
      </div>
      {prompt && (
        <button
          type="button"
          onClick={() => void install()}
          className="flex-none rounded-full bg-[var(--accent)] px-3 py-2 text-[11px] font-semibold text-white"
        >
          Install
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install suggestion"
        className="grid h-7 w-7 flex-none place-items-center rounded-full text-[12px] text-[var(--ink-soft)]"
      >
        ✕
      </button>
    </aside>
  );
}
