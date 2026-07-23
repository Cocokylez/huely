import type { ViewMode } from "@/lib/image/types";

export type WorkspacePanel = "colors" | "steps" | "compare";
export type CanvasCompareMode = "split" | "overlay" | "side";

export interface WorkspaceSettings {
  view: ViewMode;
  gridN: number;
  guides: number;
  gray: boolean;
  flip: boolean;
  adjustments: { b: number; c: number; s: number };
  focusColor: number | null;
  panel: WorkspacePanel;
}

export interface WorkspaceViewport {
  scale: number;
  /** Pan expressed as a share of the visible frame so it survives screen-size changes. */
  x: number;
  y: number;
}

export interface CanvasCompareSettings {
  mode: CanvasCompareMode;
  split: number;
  opacity: number;
}

export interface ProjectWorkspaceCache {
  version: 1;
  settings?: WorkspaceSettings;
  viewport?: WorkspaceViewport;
  compare?: CanvasCompareSettings;
}

const PREFIX = "huely-workspace-v1:";

function keyFor(projectId: string) {
  return `${PREFIX}${projectId}`;
}

export function readProjectWorkspace(projectId: string): ProjectWorkspaceCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(keyFor(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProjectWorkspaceCache;
    return parsed?.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export function patchProjectWorkspace(
  projectId: string,
  patch: Omit<Partial<ProjectWorkspaceCache>, "version">,
): void {
  if (typeof window === "undefined") return;
  try {
    const current = readProjectWorkspace(projectId);
    const next: ProjectWorkspaceCache = { version: 1, ...(current ?? {}), ...patch };
    window.localStorage.setItem(keyFor(projectId), JSON.stringify(next));
  } catch {
    // Workspace preferences are a convenience; painting data remains unaffected.
  }
}

export function clearProjectWorkspace(projectId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(keyFor(projectId));
  } catch {
    // Best effort.
  }
}
