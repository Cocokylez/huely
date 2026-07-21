import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { HistoryProject } from "./types";

interface HuelyDB extends DBSchema {
  projects: {
    key: string;
    value: HistoryProject;
    indexes: { createdAt: number };
  };
}

let dbPromise: Promise<IDBPDatabase<HuelyDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<HuelyDB>("huely", 1, {
      upgrade(db) {
        const store = db.createObjectStore("projects", { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
      },
    });
  }
  return dbPromise;
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

export async function localRemove(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("projects", id);
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
