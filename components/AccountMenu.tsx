"use client";

import { signOut } from "@/app/auth/actions";

export function AccountMenu({ name }: { name: string }) {
  return (
    <form action={signOut} className="flex items-center gap-2">
      <span className="hidden max-w-[10ch] truncate text-sm font-semibold sm:inline">{name}</span>
      <button
        type="submit"
        className="rounded-full border border-neutral-300 bg-white/70 px-3.5 py-2 text-sm font-semibold text-neutral-800 hover:border-neutral-500"
      >
        Log out
      </button>
    </form>
  );
}
