"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMixer } from "@/components/mixer/MixerProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccountMenu } from "@/components/AccountMenu";

export type NavUser = { email: string; displayName: string | null } | null;

const CONIC = "conic-gradient(#c65d3b,#e0b64f,#2f6f6a,#5a8f4e,#c65d3b)";

function segClass(active: boolean) {
  return `rounded-full px-3 py-1.5 text-[13px] font-semibold transition ${
    active
      ? "bg-[var(--card-2)] text-[var(--ink)] shadow-[var(--shadow-sm)]"
      : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
  }`;
}

/** Floating pill nav — 12px inset, sticky (spec 02 · Nav). */
export function Navbar({ user }: { user: NavUser }) {
  const { open, openMixer } = useMixer();
  const pathname = usePathname();

  const initial = (user?.displayName || user?.email || "?").charAt(0).toUpperCase();

  return (
    <div className="sticky top-3 z-30 px-3">
      <nav className="mx-auto flex max-w-5xl items-center justify-between rounded-full border border-[var(--line)] bg-[var(--card-2)]/95 py-1.5 pl-4 pr-2 shadow-[var(--shadow-sm)]">
        <Link href="/" className="flex items-center gap-2 text-[var(--ink)]">
          <span
            className="h-3.5 w-3.5 rounded-full"
            style={{ background: "radial-gradient(circle at 35% 30%, var(--accent-soft), var(--accent) 72%)" }}
            aria-hidden
          />
          <b className="text-[16px] tracking-tight">Huely</b>
        </Link>

        <div className="flex items-center gap-1.5">
          <div className="hidden rounded-full bg-[var(--paper-2)] p-[3px] sm:flex">
            <button onClick={openMixer} className={segClass(open)}>
              Mixer
            </button>
            <Link href="/history" className={segClass(pathname === "/history")}>
              History
            </Link>
          </div>

          {/* Mobile: icon circles */}
          <button
            onClick={openMixer}
            aria-label="Color mixer"
            className="grid h-[34px] w-[34px] place-items-center rounded-full border border-[var(--line)] bg-[var(--paper-2)] active:scale-95 sm:hidden"
          >
            <span className="h-3 w-3 rounded-full" style={{ background: CONIC }} />
          </button>
          <Link
            href="/history"
            aria-label="History"
            className="grid h-[34px] w-[34px] place-items-center rounded-full border border-[var(--line)] bg-[var(--paper-2)] text-[13px] text-[var(--ink-soft)] active:scale-95 sm:hidden"
          >
            🕘
          </Link>

          <ThemeToggle />

          {user ? (
            <div className="flex items-center gap-1.5">
              <span
                className="grid h-[30px] w-[30px] place-items-center rounded-full"
                style={{ background: CONIC }}
                title={user.displayName || user.email}
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[#b8927a] text-[11px] font-bold text-white">
                  {initial}
                </span>
              </span>
              <AccountMenu name={user.displayName || user.email} />
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-[var(--ink)] px-3.5 py-2 text-[13px] font-semibold text-[var(--paper)] active:scale-95"
            >
              <span className="hidden sm:inline">Log in / Sign up</span>
              <span className="sm:hidden">Log in</span>
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
