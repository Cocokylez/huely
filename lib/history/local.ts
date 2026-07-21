import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { HistoryProject } from "./types";

interface HuelyDB extends DBSchema {
  projects: {
    key: string;
    value: HistoryProject;
    indexes: { createdAt: number };
  };
  // Full working-res source image per project — device-local only, never uploaded.
  sources: {
    key: string;
    value: { id: string; url: string };
  };
}

let dbPromise: Promise<IDBPDatabase<HuelyDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<HuelyDB>("huely", 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("projects")) {
          const store = db.createObjectStore("projects", { keyPath: "id" });
          store.createIndex("createdAt", "createdAt");
        }
        if (!db.objectStoreNames.contains("sources")) {
          db.createObjectStore("sources", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveSource(id: string, url: string): Promise<void> {
  const db = await getDb();
  await db.put("sources", { id, url });
}

export async function getSource(id: string): Promise<string | undefined> {
  const db = await getDb();
  const row = await db.get("sources", id);
  return row?.url;
}

export async function removeSource(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("sources", id);
}

export async function localList(): Promise<HistoryProject[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex("projects", "createdAt");
  return all.reverse(); // newest first
}

export async function localSave(project: HistoryProject): Promise<void> {
  const db = await getDb();
  await db.put("projects", project);
}

export async function localGet(id: string): Promise<HistoryProject | undefined> {
  const db = await getDb();
  return db.get("projects", id);
}

export async function localRemove(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("projects", id);
  await db.delete("sources", id).catch(() => {});
}

export async function localRename(id: string, name: string): Promise<void> {
  const db = await getDb();
  const existing = await db.get("projects", id);
  if (existing) await db.put("projects", { ...existing, name });
}

export async function localClear(): Promise<void> {
  const db = await getDb();
  await db.clear("projects");
}
