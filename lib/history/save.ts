import type { HistoryProject } from "./types";
import { localSave, localGet, saveSource, getSource, removeSource } from "./local";
import { cloudSave, cloudUpdate, cloudGet, cloudUpdateDone } from "./cloud";

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

/** Patch just the progress (done indices) — cheap, no thumbnail regen. */
export async function patchDone(authed: boolean, id: string, done: number[]): Promise<void> {
  if (authed) {
    await cloudUpdateDone(id, done);
  } else {
    const existing = await localGet(id);
    if (existing) await localSave({ ...existing, done });
  }
}
