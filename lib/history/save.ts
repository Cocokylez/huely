import type { HistoryProject } from "./types";
import { localSave } from "./local";
import { cloudSave } from "./cloud";

/** Save a project to the cloud when signed in, otherwise to local IndexedDB. */
export async function saveProject(authed: boolean, project: HistoryProject): Promise<void> {
  if (authed) await cloudSave(project);
  else await localSave(project);
}
