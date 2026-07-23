"use client";

import { useCallback, useEffect, useState } from "react";
import type { HistoryProject } from "@/lib/history/types";
import { localList, localRename } from "@/lib/history/local";
import { cloudList, cloudRename } from "@/lib/history/cloud";
import { removeProject } from "@/lib/history/save";

/** Unified history: cloud (Supabase) when signed in, local (IndexedDB) otherwise. */
export function useHistory(authed: boolean) {
  const [items, setItems] = useState<HistoryProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(authed ? await cloudList() : await localList());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load history.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [authed]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handleHistoryChange = () => refresh();
    window.addEventListener("huely-history-changed", handleHistoryChange);
    return () => window.removeEventListener("huely-history-changed", handleHistoryChange);
  }, [refresh]);

  const remove = useCallback(
    async (id: string) => {
      await removeProject(authed, id);
      await refresh();
    },
    [authed, refresh],
  );

  const rename = useCallback(
    async (id: string, name: string) => {
      if (authed) await cloudRename(id, name);
      else await localRename(id, name);
      await refresh();
    },
    [authed, refresh],
  );

  return { items, loading, error, remove, rename, refresh };
}
