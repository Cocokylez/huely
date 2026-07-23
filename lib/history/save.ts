import type { HistoryProject } from "./types";
import {
  localSave,
  localGet,
  localList,
  localRemoveProjectRecord,
  saveSource,
  getSource,
  removeSource,
  saveShot,
  getShot,
  removeShot,
} from "./local";
import { cloudSave, cloudUpdate, cloudGet, cloudList, cloudUpdateDone } from "./cloud";

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

  return result;
}

/** Save a new project — cloud when signed in, local IndexedDB otherwise. */
export async function saveProject(authed: boolean, project: HistoryProject): Promise<void> {
  if (authed) await cloudSave(project);
  else await localSave(project);
}

/** Update an existing project (rename, re-quantize, mixer changes). */
export async function updateProject(authed: boolean, project: HistoryProject): Promise<void> {
  if (authed) await cloudUpdate(project);
  else await localSave(project); // IndexedDB put upserts
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
    if (existing) await localSave({ ...existing, done });
  }
}
