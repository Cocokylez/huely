"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearCachedShots,
  clearCachedSources,
  getDeviceStorageStats,
  type DeviceStorageStats,
  type DeviceStoreStats,
} from "@/lib/history/local";
import { HUELY_STORAGE_CHANGED } from "@/lib/history/save";
import { useToast } from "@/components/ui/ToastProvider";
import { Icon } from "@/components/ui/Icon";

interface OriginStorageEstimate {
  usage: number;
  quota: number;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  const digits = index === 0 || value >= 10 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[index]}`;
}

function StorageRow({
  label,
  description,
  stats,
  action,
  disabled,
}: {
  label: string;
  description: string;
  stats: DeviceStoreStats;
  action?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 border-t border-[var(--line)] py-3 first:border-t-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <b className="text-[13px]">{label}</b>
          <span className="text-[11px] text-[var(--ink-soft)]">
            {stats.count} {stats.count === 1 ? "item" : "items"} · {formatBytes(stats.bytes)}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--ink-soft)]">{description}</p>
      </div>
      {action && (
        <button
          type="button"
          onClick={action}
          disabled={disabled || stats.count === 0}
          className="flex-none rounded-full border border-[var(--line)] bg-[var(--card-2)] px-3 py-1.5 text-[11px] font-semibold text-[var(--ink-soft)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Clear
        </button>
      )}
    </div>
  );
}

export function StorageManager({ authed }: { authed: boolean }) {
  const { toast } = useToast();
  const [opened, setOpened] = useState(false);
  const [stats, setStats] = useState<DeviceStorageStats | null>(null);
  const [origin, setOrigin] = useState<OriginStorageEstimate | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [canPersist, setCanPersist] = useState(false);
  const [busy, setBusy] = useState<"sources" | "shots" | "persist" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const storage = navigator.storage;
      const [device, estimate, isPersisted] = await Promise.all([
        getDeviceStorageStats(),
        storage?.estimate?.().catch(() => undefined) ?? Promise.resolve(undefined),
        storage?.persisted?.().catch(() => null) ?? Promise.resolve(null),
      ]);

      setStats(device);
      setOrigin(
        estimate?.usage != null && estimate?.quota != null
          ? { usage: estimate.usage, quota: estimate.quota }
          : null,
      );
      setPersisted(isPersisted);
      setCanPersist(typeof storage?.persist === "function");
    } catch {
      setError("Device storage details are unavailable in this browser.");
    }
  }, []);

  useEffect(() => {
    if (!opened) return;
    const handleChange = () => void refresh();
    window.addEventListener(HUELY_STORAGE_CHANGED, handleChange);
    return () => window.removeEventListener(HUELY_STORAGE_CHANGED, handleChange);
  }, [opened, refresh]);

  const clearSources = async () => {
    if (!stats?.sources.count) return;
    const confirmed = window.confirm(
      "Clear cached original photos? Your projects and palettes will stay, but reopened projects will use smaller previews and cannot be reprocessed until you add the photo again.",
    );
    if (!confirmed) return;

    const freed = stats.sources.bytes;
    setBusy("sources");
    try {
      await clearCachedSources();
      window.dispatchEvent(new Event(HUELY_STORAGE_CHANGED));
      await refresh();
      toast(`${formatBytes(freed)} of original-photo cache cleared`);
    } catch {
      setError("Huely could not clear the original-photo cache.");
    } finally {
      setBusy(null);
    }
  };

  const clearShots = async () => {
    if (!stats?.shots.count) return;
    const confirmed = window.confirm(
      "Clear canvas progress photos from this device? Project cards, palettes, and original-photo cache will stay.",
    );
    if (!confirmed) return;

    const freed = stats.shots.bytes;
    setBusy("shots");
    try {
      await clearCachedShots();
      window.dispatchEvent(new Event(HUELY_STORAGE_CHANGED));
      await refresh();
      toast(`${formatBytes(freed)} of canvas photos cleared`);
    } catch {
      setError("Huely could not clear the canvas photos.");
    } finally {
      setBusy(null);
    }
  };

  const keepAvailable = async () => {
    if (!navigator.storage?.persist) return;
    setBusy("persist");
    try {
      const granted = await navigator.storage.persist();
      setPersisted(granted);
      toast(
        granted
          ? "Huely storage is protected from automatic cleanup"
          : "Your browser will continue managing cached storage",
      );
    } catch {
      setError("This browser could not change the storage protection setting.");
    } finally {
      setBusy(null);
    }
  };

  const browserPercent = origin?.quota
    ? Math.min(100, Math.max(0, (origin.usage / origin.quota) * 100))
    : 0;

  return (
    <details
      className="group rounded-xl border border-[var(--line)] bg-[var(--card)] shadow-[var(--shadow-sm)]"
      onToggle={(event) => {
        if (!event.currentTarget.open) return;
        setOpened(true);
        void refresh();
      }}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-3.5 py-3.5">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-[var(--paper-2)] text-[15px]" aria-hidden>
          <Icon name="archive" size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <b className="block text-[13px]">Device storage</b>
          <span className="block text-[11px] text-[var(--ink-soft)]">
            {stats ? `${formatBytes(stats.totalBytes)} used by Huely` : "Review and clear image cache"}
          </span>
        </span>
        <span className="text-[13px] text-[var(--ink-soft)] transition group-open:rotate-180" aria-hidden>
          <Icon name="chevronDown" size={16} />
        </span>
      </summary>

      {opened && (
        <div className="border-t border-[var(--line)] px-3.5 pb-3.5 pt-2">
          {error && (
            <p role="alert" className="my-2 rounded-lg bg-[var(--paper-2)] px-3 py-2 text-[12px] text-[var(--accent)]">
              {error}
            </p>
          )}

          {!stats ? (
            <div className="my-3 h-20 overflow-hidden rounded-lg bg-[var(--paper-2)]">
              <div className="shimmer h-full w-full" />
            </div>
          ) : (
            <>
              <StorageRow
                label={authed ? "Local project records" : "Project cards"}
                description={
                  authed
                    ? "Usually empty after account sync. Any remaining items are kept for a safe retry."
                    : "Your saved project history. Delete projects individually above when you no longer need them."
                }
                stats={stats.projects}
              />
              <StorageRow
                label="Original-photo cache"
                description="Keeps reopened projects crisp and lets Huely rebuild palettes on this device."
                stats={stats.sources}
                action={() => void clearSources()}
                disabled={busy !== null}
              />
              <StorageRow
                label="Canvas progress photos"
                description="Private camera check-ins of your physical painting, stored only on this device."
                stats={stats.shots}
                action={() => void clearShots()}
                disabled={busy !== null}
              />
            </>
          )}

          {origin && (
            <div className="mt-2 rounded-lg bg-[var(--paper-2)] px-3 py-2.5">
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <b>Browser storage</b>
                <span className="text-[var(--ink-soft)]">
                  {formatBytes(origin.usage)} of {formatBytes(origin.quota)}
                </span>
              </div>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--line)]"
                role="progressbar"
                aria-label="Browser storage used"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(browserPercent)}
              >
                <div
                  className="h-full rounded-full bg-[var(--accent-2)]"
                  style={{ width: `${browserPercent}%` }}
                />
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--ink-soft)]">
                This total includes Huely, downloaded app files, and other data stored for this site.
              </p>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[11px] leading-relaxed text-[var(--ink-soft)]">
              {persisted
                ? "Protected from automatic browser cleanup."
                : "Paint choices and theme are tiny and are never cleared here."}
            </p>
            {canPersist && !persisted && (
              <button
                type="button"
                onClick={() => void keepAvailable()}
                disabled={busy !== null}
                className="flex-none rounded-full bg-[var(--accent-2)] px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
              >
                Keep available
              </button>
            )}
          </div>
        </div>
      )}
    </details>
  );
}
