"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useMixer } from "@/components/mixer/MixerProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccountMenu } from "@/components/AccountMenu";
import { Icon, type IconName } from "@/components/ui/Icon";

export type NavUser = { email: string; displayName: string | null } | null;

function itemClass(active: boolean) {
  return `group flex min-h-[54px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[10px] font-semibold transition ${
    active
      ? "bg-[var(--paper-2)] text-[var(--accent)]"
      : "text-[var(--ink-soft)] hover:bg-[var(--paper-2)] hover:text-[var(--ink)]"
  }`;
}

function NavIcon({ name, active }: { name: IconName; active: boolean }) {
  return (
    <span
      className={`grid h-6 w-8 place-items-center rounded-full transition ${
        active ? "text-[var(--accent)]" : "text-[var(--ink-soft)] group-hover:text-[var(--ink)]"
      }`}
    >
      <Icon name={name} size={19} strokeWidth={active ? 2.2 : 1.8} />
    </span>
  );
}

/** Persistent bottom app navigation. Full-screen workspace layers replace it. */
export function Navbar({ user }: { user: NavUser }) {
  const { open, openMixer, closeMixer } = useMixer();
  const pathname = usePathname();
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    if (!accountOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [accountOpen]);

  const createActive = pathname === "/";
  const projectsActive = pathname === "/history";
  const accountActive = accountOpen || ["/login", "/signup", "/forgot-password", "/reset-password"].includes(pathname);
  const accountName = user?.displayName || user?.email || "Guest artist";
  const initial = accountName.charAt(0).toUpperCase();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="relative mx-auto max-w-md">
        {accountOpen && (
          <>
            <button
              type="button"
              tabIndex={-1}
              aria-label="Close account options"
              className="pointer-events-auto fixed inset-0 z-0 bg-transparent"
              onClick={() => setAccountOpen(false)}
            />
            <section
              role="dialog"
              aria-label="Account and appearance"
              className="pointer-events-auto absolute bottom-[calc(100%+0.625rem)] right-0 z-10 w-[min(18rem,calc(100vw-1.5rem))] rounded-[20px] border border-[var(--line)] bg-[var(--card-2)] p-3.5 shadow-[var(--shadow)]"
            >
              <div className="flex items-center gap-3 border-b border-[var(--line)] pb-3">
                <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-[var(--accent)] text-[13px] font-bold text-white">
                  {initial}
                </span>
                <div className="min-w-0 flex-1">
                  <b className="block truncate text-[13px]">{accountName}</b>
                  <span className="text-[11px] text-[var(--ink-soft)]">
                    {user ? "Huely account" : "Projects stay on this device"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAccountOpen(false)}
                  aria-label="Close account options"
                  className="grid h-9 w-9 place-items-center rounded-full text-[var(--ink-soft)] hover:bg-[var(--paper-2)]"
                >
                  <Icon name="x" size={16} />
                </button>
              </div>

              <div className="flex items-center justify-between py-2.5">
                <span className="text-[12px] font-semibold text-[var(--ink-soft)]">Appearance</span>
                <ThemeToggle />
              </div>

              {user ? (
                <AccountMenu name={accountName} />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    onClick={() => setAccountOpen(false)}
                    className="rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 py-2.5 text-center text-[12px] font-semibold text-[var(--ink)]"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setAccountOpen(false)}
                    className="rounded-xl bg-[var(--ink)] px-3 py-2.5 text-center text-[12px] font-semibold text-[var(--paper)]"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </section>
          </>
        )}

        <nav
          aria-label="Main navigation"
          className="pointer-events-auto relative z-10 grid grid-cols-4 gap-1 rounded-[22px] border border-[var(--line)] bg-[var(--card-2)]/95 p-1.5 shadow-[0_12px_38px_rgba(43,39,35,0.18)] backdrop-blur-xl"
        >
          <Link href="/" aria-current={createActive ? "page" : undefined} className={itemClass(createActive)}>
            <NavIcon name="imagePlus" active={createActive} />
            Create
          </Link>
          <Link
            href="/history"
            aria-current={projectsActive ? "page" : undefined}
            className={itemClass(projectsActive)}
          >
            <NavIcon name="projects" active={projectsActive} />
            Projects
          </Link>
          <button
            type="button"
            aria-pressed={open}
            onClick={() => {
              setAccountOpen(false);
              openMixer();
            }}
            className={itemClass(open)}
          >
            <NavIcon name="palette" active={open} />
            Paint Lab
          </button>
          <button
            type="button"
            aria-pressed={accountOpen}
            onClick={() => {
              closeMixer();
              setAccountOpen((current) => !current);
            }}
            className={itemClass(accountActive)}
          >
            <NavIcon name="user" active={accountActive} />
            Account
          </button>
        </nav>
      </div>
    </div>
  );
}
