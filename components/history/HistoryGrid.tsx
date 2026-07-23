"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useHistory } from "@/lib/hooks/useHistory";
import { StorageManager } from "@/components/history/StorageManager";
import { Icon } from "@/components/ui/Icon";

/** History — "My projects" (spec 03 · History). */
export function HistoryGrid({ authed }: { authed: boolean }) {
  const { items, loading, error, remove, rename } = useHistory(authed);
  const router = useRouter();
  const [menuFor, setMenuFor] = useState<string | null>(null);

  return (
    <div>
      <h1 className="text-[28px] font-extrabold tracking-[-0.02em]">My projects</h1>
      <p className="mb-5 mt-1 text-[13px] text-[var(--ink-soft)]">
        {authed ? "Synced to your account" : "Saved on this device"}
        {!loading && ` · ${items.length} project${items.length === 1 ? "" : "s"}`}
      </p>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[130px] rounded-xl bg-[var(--paper-2)]">
              <div className="shimmer h-full w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div
          className="flex items-center gap-3 rounded-xl border border-[var(--accent)] p-3 text-[13px]"
          style={{ background: "color-mix(in srgb, var(--accent) 6%, var(--card))" }}
        >
          <span className="text-[var(--ink-soft)]">
            <b className="text-[var(--ink)]">{error}</b> · Reload to retry
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((p) => (
            <div
              key={p.id}
              className="relative overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--card)] shadow-[var(--shadow-sm)]"
            >
              <button
                onClick={() => router.push(`/?open=${p.id}`)}
                className="block w-full text-left"
                title={`Open ${p.name}`}
              >
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.thumbDataUrl} alt={p.name} className="aspect-[4/3] w-full object-cover" />
                  <span className="absolute right-1.5 top-1.5 flex gap-0.5">
                    {p.palette.slice(0, 4).map((c, i) => (
                      <span
                        key={i}
                        className="h-3 w-1 rounded-sm"
                        style={{ background: c.hex }}
                      />
                    ))}
                  </span>
                </div>
                <div className="px-2.5 pb-2 pt-1.5">
                  <b className="block truncate text-[13px]">{p.name}</b>
                  <span className="text-[11px] text-[var(--ink-soft)]">
                    {new Date(p.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    · {p.palette.length} colors
                  </span>
                </div>
              </button>

              <button
                type="button"
                aria-label="Project menu"
                onClick={() => setMenuFor(menuFor === p.id ? null : p.id)}
                className="absolute bottom-1.5 right-1.5 grid h-7 w-7 place-items-center rounded-full border border-[var(--line)] bg-[var(--card-2)] text-[13px] text-[var(--ink-soft)] hover:text-[var(--ink)]"
              >
                <Icon name="more" size={17} />
              </button>

              {menuFor === p.id && (
                <div className="absolute bottom-9 right-1.5 z-10 w-[110px] rounded-[10px] border border-[var(--line)] bg-[var(--card-2)] p-1 shadow-[var(--shadow)]">
                  <button
                    onClick={() => router.push(`/?open=${p.id}`)}
                    className="block w-full rounded-md px-2.5 py-1.5 text-left text-[12px] font-semibold hover:bg-[var(--paper-2)]"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => {
                      setMenuFor(null);
                      const next = window.prompt("Rename project", p.name);
                      if (next && next.trim()) rename(p.id, next.trim());
                    }}
                    className="block w-full rounded-md px-2.5 py-1.5 text-left text-[12px] font-semibold hover:bg-[var(--paper-2)]"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => {
                      setMenuFor(null);
                      if (window.confirm(`Delete "${p.name}"?`)) remove(p.id);
                    }}
                    className="block w-full rounded-md px-2.5 py-1.5 text-left text-[12px] font-semibold text-[var(--accent)] hover:bg-[var(--paper-2)]"
                  >
                    Delete…
                  </button>
                </div>
              )}
            </div>
          ))}

          <Link
            href="/"
            className="grid min-h-[130px] place-items-center rounded-xl border-2 border-dashed border-[var(--line)] text-center text-[13px] text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <span className="flex flex-col items-center gap-1.5">
              <Icon name="imagePlus" size={22} />
              New photo
            </span>
          </Link>
        </div>
      )}

      <div className="mt-5">
        <StorageManager authed={authed} />
      </div>

      <div className="mt-3 rounded-[10px] border border-[var(--line)] bg-[var(--paper-2)] px-3.5 py-3 text-[12px] leading-relaxed text-[var(--ink-soft)]">
        <b className="text-[var(--ink)]">Private by default.</b>{" "}
        {authed ? (
          <>Your projects sync to your account — palettes and thumbnails only, never photos.</>
        ) : (
          <>
            Projects live in this browser.{" "}
            <Link href="/login" className="font-semibold text-[var(--accent)]">
              Log in
            </Link>{" "}
            to sync across devices — palettes + thumbnails only, never photos.
          </>
        )}
      </div>
    </div>
  );
}
