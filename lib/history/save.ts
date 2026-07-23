import type { HistoryProject } from "./types";
import {
  localSave,
  localGet,
  localList,
  localRemove,
  localRemoveProjectRecord,
  saveSource,
  getSource,
  removeSource,
  saveShot,
  getShot,
  removeShot,
} from "./local";
import {
  cloudSave,
  cloudUpdate,
  cloudGet,
  cloudList,
  cloudUpdateDone,
  cloudRemove,
} from "./cloud";

export const HUELY_STORAGE_CHANGED = "huely-storage-changed";

function announceStorageChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(HUELY_STORAGE_CHANGED));
}

export interface GuestMigrationResult {
  moved: number;
  alreadyCloud: number;
  failed: number;
}

/**
 * Copy guest projects into the signed-in account, then remove only their local
 * metadata. Device-only source images and canvas photos deliberately remain in
 * IndexedDB and keep the same project id, so full-resolution reopen still works.
 *
 * A project is never removed locally until its cloud copy is confirmed. Calling
 * this repeatedly is safe: ids already present in the account are simply cleaned
 * out of the guest list.
 */
export async function migrateGuestProjects(): Promise<GuestMigrationResult> {
  const guestProjects = await localList();
  if (!guestProjects.length) return { moved: 0, alreadyCloud: 0, failed: 0 };

  const cloudIds = new Set((await cloudList()).map((project) => project.id));
  const result: GuestMigrationResult = { moved: 0, alreadyCloud: 0, failed: 0 };

  for (const project of guestProjects) {
    try {
      if (cloudIds.has(project.id)) {
        result.alreadyCloud += 1;
      } else {
        await cloudSave(project);
        cloudIds.add(project.id);
        result.moved += 1;
      }
      await localRemoveProjectRecord(project.id);
    } catch {
      // Preserve the guest record so a later login/page load can retry safely.
      result.failed += 1;
    }
  }

  if (result.moved || result.alreadyCloud) announceStorageChange();

  return result;
}

/** Save a new project — cloud when signed in, local IndexedDB otherwise. */
export async function saveProject(authed: boolean, project: HistoryProject): Promise<void> {
  if (authed) await cloudSave(project);
  else {
    await localSave(project);
    announceStorageChange();
  }
}

/** Update an existing project (rename, re-quantize, mixer changes). */
export async function updateProject(authed: boolean, project: HistoryProject): Promise<void> {
  if (authed) await cloudUpdate(project);
  else {
    await localSave(project); // IndexedDB put upserts
    announceStorageChange();
  }
}

/** Delete the project and any device-only media associated with its id. */
export async function removeProject(authed: boolean, id: string): Promise<void> {
  if (authed) {
    await cloudRemove(id);
    await Promise.all([removeSource(id).catch(() => {}), removeShot(id).catch(() => {})]);
  } else {
    await localRemove(id);
  }
  announceStorageChange();
}

/** Fetch one project by id from whichever store is active. */
export async function getProject(
  authed: boolean,
  id: string,
): Promise<HistoryProject | undefined> {
  return authed ? cloudGet(id) : localGet(id);
}

/**
 * The full working-res source image is cached ON-DEVICE only (IndexedDB),
 * regardless of auth — it never goes to the cloud. Lets a reopened project
 * re-run the real pipeline at full res instead of showing the thumbnail.
 */
export async function cacheSource(id: string, dataUrl: string): Promise<void> {
  try {
    await saveSource(id, dataUrl);
    announceStorageChange();
  } catch {
    // Storage full or unavailable — fall back to the thumbnail on reopen.
  }
}

export async function getCachedSource(id: string): Promise<string | undefined> {
  try {
    return await getSource(id);
  } catch {
    return undefined;
  }
}

export async function removeCachedSource(id: string): Promise<void> {
  try {
    await removeSource(id);
    announceStorageChange();
  } catch {
    // best effort
  }
}

/**
 * A photo of the painter's real canvas, kept ON-DEVICE only (never uploaded)
 * so they can compare their work against the reference.
 */
export async function cacheShot(id: string, dataUrl: string): Promise<void> {
  try {
    await saveShot(id, dataUrl);
    announceStorageChange();
  } catch {
    // storage full/unavailable — the compare view just won't have a photo
  }
}

export async function getCachedShot(id: string): Promise<string | undefined> {
  try {
    return await getShot(id);
  } catch {
    return undefined;
  }
}

export async function removeCachedShot(id: string): Promise<void> {
  try {
    await removeShot(id);
    announceStorageChange();
  } catch {
    // best effort
  }
}

/** Patch just the progress (done indices) — cheap, no thumbnail regen. */
export async function patchDone(authed: boolean, id: string, done: number[]): Promise<void> {
  if (authed) {
    await cloudUpdateDone(id, done);
  } else {
    const existing = await localGet(id);
    if (existing) {
      await localSave({ ...existing, done });
      announceStorageChange();
    }
  }
}
