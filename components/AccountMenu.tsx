"use client";

import { signOut } from "@/app/auth/actions";

export function AccountMenu({ name }: { name: string }) {
  return (
    <form action={signOut} className="flex items-center">
      <button
        type="submit"
        title={`Signed in as ${name}`}
        className="rounded-full border border-[var(--line)] bg-[var(--paper-2)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ink-soft)] hover:text-[var(--ink)] active:scale-95"
      >
        Log out
      </button>
    </form>
  );
}
