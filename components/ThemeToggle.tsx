"use client";

import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";

type Theme = "system" | "light" | "dark";

const ORDER: Theme[] = ["system", "light", "dark"];
const ICON: Record<Theme, IconName> = { system: "monitor", light: "sun", dark: "moon" };

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

/** Cycles system → light → dark. Stored in localStorage("huely-theme");
 *  the pre-hydration script in layout.tsx applies it before first paint. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const saved = localStorage.getItem("huely-theme") as Theme | null;
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  const cycle = () => {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    setTheme(next);
    if (next === "system") localStorage.removeItem("huely-theme");
    else localStorage.setItem("huely-theme", next);
    apply(next);
  };

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${theme}`}
      title={`Theme: ${theme}`}
      className="grid h-[34px] w-[34px] place-items-center rounded-full text-[15px] text-[var(--ink-soft)] hover:text-[var(--ink)] active:scale-95"
    >
      <Icon name={ICON[theme]} size={17} />
    </button>
  );
}
