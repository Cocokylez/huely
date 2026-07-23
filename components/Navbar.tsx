"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useMixer } from "@/components/mixer/MixerProvider";
import { useCreateFlow } from "@/components/create/CreateProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccountMenu } from "@/components/AccountMenu";
import { Icon, type IconName } from "@/components/ui/Icon";

export type NavUser = { email: string; displayName: string | null } | null;

function itemClass(active: boolean) {
  return `group flex min-h-[56px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-0.5 text-[9px] font-semibold transition ${
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
      <Icon name={name} size={18} strokeWidth={active ? 2.2 : 1.8} />
    </span>
  );
}

/** Home-level navigation. The full-screen workspace replaces it with contextual tools. */
export function Navbar({ user }: { user: NavUser }) {
  const { open: mixerOpen, openMixer, closeMixer } = useMixer();
  const { open: createOpen, openCreate, closeCreate } = useCreateFlow();
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

  const projectsActive = pathname === "/" || pathname === "/history" || pathname.startsWith("/studio");
  const createActive = createOpen || pathname === "/create";
  const guideActive = pathname === "/guide";
  const accountActive =
    accountOpen || ["/login", "/signup", "/forgot-password", "/reset-password"].includes(pathname);
  const accountName = user?.displayName || user?.email || "Guest artist";
  const initial = accountName.charAt(0).toUpperCase();

  const closePanels = () => {
    setAccountOpen(false);
    closeMixer();
    closeCreate();
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="relative mx-auto max-w-lg">
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
          className="pointer-events-auto relative z-10 grid grid-cols-5 items-end gap-0.5 rounded-[22px] border border-[var(--line)] bg-[var(--card-2)]/95 p-1.5 shadow-[0_12px_38px_rgba(43,39,35,0.18)] backdrop-blur-xl"
        >
          <Link
            href="/"
            onClick={closePanels}
            aria-current={projectsActive ? "page" : undefined}
            className={itemClass(projectsActive)}
          >
            <NavIcon name="projects" active={projectsActive} />
            Projects
          </Link>

          <button
            type="button"
            aria-pressed={mixerOpen}
            onClick={() => {
              setAccountOpen(false);
              closeCreate();
              openMixer();
            }}
            className={itemClass(mixerOpen)}
          >
            <NavIcon name="palette" active={mixerOpen} />
            Paint Lab
          </button>

          <button
            type="button"
            aria-pressed={createActive}
            aria-label="Create a new painting project"
            onClick={() => {
              setAccountOpen(false);
              closeMixer();
              openCreate();
            }}
            className="group relative flex min-h-[56px] min-w-0 flex-col items-center justify-end rounded-2xl px-0.5 pb-1 text-[9px] font-bold text-[var(--accent)]"
          >
            <span
              className={`absolute -top-6 grid h-14 w-14 place-items-center rounded-full border-[5px] border-[var(--card-2)] text-white shadow-[0_8px_22px_rgba(198,93,59,0.35)] transition group-active:scale-95 ${
                createActive ? "bg-[var(--ink)]" : "bg-[var(--accent)]"
              }`}
            >
              <Icon name="plus" size={24} strokeWidth={2.3} />
            </span>
            <span>Create</span>
          </button>

          <Link
            href="/guide"
            onClick={closePanels}
            aria-current={guideActive ? "page" : undefined}
            className={itemClass(guideActive)}
          >
            <NavIcon name="book" active={guideActive} />
            Guide
          </Link>

          <button
            type="button"
            aria-pressed={accountOpen}
            onClick={() => {
              closeMixer();
              closeCreate();
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
