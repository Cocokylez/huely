"use client";

import Link from "next/link";
import { useHistory } from "@/lib/hooks/useHistory";
import { useToast } from "@/components/ui/ToastProvider";

export function HistoryGrid({ authed }: { authed: boolean }) {
  const { items, loading, error, remove, rename } = useHistory(authed);
  const { toast } = useToast();

  if (loading) return <p className="py-12 text-center text-neutral-500">Loading…</p>;
  if (error) return <p className="py-12 text-center text-red-600">{error}</p>;

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white/60 p-8 text-center">
        <p className="font-semibold">No saved palettes yet</p>
        <p className="mt-1 text-sm text-neutral-500">
          {authed
            ? "Save a palette from the studio and it'll show up here."
            : "Saved palettes are kept on this device. Log in to sync them across devices."}
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-xl bg-[var(--accent,#c65d3b)] px-4 py-2.5 text-sm font-semibold text-white"
        >
          Open the studio
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((p) => (
        <div
          key={p.id}
          className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white/70 shadow-sm"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.thumbDataUrl} alt={p.name} className="aspect-[4/3] w-full object-cover" />
          <div className="flex items-center justify-between gap-2 px-3 pt-2.5">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{p.name}</div>
              <div className="text-xs text-neutral-400">
                {new Date(p.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div className="flex flex-none gap-1">
              <button
                aria-label="Rename"
                title="Rename"
                onClick={() => {
                  const name = window.prompt("Rename palette", p.name);
                  if (name && name.trim()) rename(p.id, name.trim());
                }}
                className="rounded-full border border-neutral-300 px-2 py-1 text-xs hover:border-neutral-500"
              >
                ✎
              </button>
              <button
                aria-label="Delete"
                title="Delete"
                onClick={() => {
                  if (window.confirm("Delete this palette?")) remove(p.id);
                }}
                className="rounded-full border border-neutral-300 px-2 py-1 text-xs hover:border-red-400 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 p-3">
            {p.palette.map((c, i) => (
              <button
                key={`${c.hex}-${i}`}
                title={`Copy ${c.hex.toUpperCase()}`}
                onClick={() => {
                  navigator.clipboard?.writeText(c.hex.toUpperCase());
                  toast(`Copied ${c.hex.toUpperCase()}`);
                }}
                className="h-6 w-6 rounded-md border border-black/10"
                style={{ background: c.hex }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
