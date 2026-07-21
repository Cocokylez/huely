import type { HistoryProject } from "./types";
import { localSave, localGet } from "./local";
import { cloudSave, cloudUpdate, cloudGet } from "./cloud";

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
