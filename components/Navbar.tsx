"use client";

import Link from "next/link";
import { useMixer } from "@/components/mixer/MixerProvider";
import { AccountMenu } from "@/components/AccountMenu";

export type NavUser = { email: string; displayName: string | null } | null;

const pill =
  "rounded-full border border-neutral-300 bg-white/70 px-3.5 py-2 text-sm font-semibold text-neutral-800 hover:border-neutral-500";

export function Navbar({ user }: { user: NavUser }) {
  const { openMixer } = useMixer();

  return (
    <nav className="sticky top-0 z-30 flex items-center justify-between border-b border-neutral-200 bg-[var(--paper)] px-4 py-3">
      <Link href="/" className="flex items-center gap-2 text-[var(--foreground)]">
        <span
          className="h-3.5 w-3.5 rounded-full"
          style={{ background: "radial-gradient(circle at 35% 30%, #e6b8a6, #c65d3b 72%)" }}
          aria-hidden
        />
        <span className="text-lg font-bold tracking-tight">Huely</span>
      </Link>

      <div className="flex items-center gap-2">
        <button onClick={openMixer} className={pill}>
          Mixer
        </button>
        <Link href="/history" className={pill}>
          History
        </Link>
        {user ? (
          <AccountMenu name={user.displayName || user.email} />
        ) : (
          <Link href="/login" className={pill}>
            Log in
          </Link>
        )}
      </div>
    </nav>
  );
}
