"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useHistory } from "@/lib/hooks/useHistory";
import { getShot } from "@/lib/history/local";
import { displayProjectName } from "@/lib/history/name";
import type { HistoryProject } from "@/lib/history/types";
import { Icon } from "@/components/ui/Icon";
import { formatCanvasSize, type CanvasSpec } from "@/lib/canvas/spec";
import { readProjectWorkspace } from "@/lib/history/workspace";

interface ProjectGroup {
  key: string;
  label: string;
  projects: HistoryProject[];
}

function progressFor(project: HistoryProject): number {
  if (!project.palette.length) return 0;
  return Math.min(100, Math.round((new Set(project.done).size / project.palette.length) * 100));
}

function calendarKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function projectDateLabel(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const key = calendarKey(date);
  if (key === calendarKey(today)) return "Today";
  if (key === calendarKey(yesterday)) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

function groupProjectsByDate(projects: HistoryProject[]): ProjectGroup[] {
  const groups: ProjectGroup[] = [];
  for (const project of projects) {
    const key = calendarKey(new Date(project.createdAt));
    const previous = groups[groups.length - 1];
    if (previous?.key === key) previous.projects.push(project);
    else groups.push({ key, label: projectDateLabel(project.createdAt), projects: [project] });
  }
  return groups;
}

function PaletteStrip({ project }: { project: HistoryProject }) {
  const swatches = project.palette.slice(0, 12);

  return (
    <span className="flex h-1.5 flex-1 overflow-hidden rounded-[3px]" aria-hidden>
      {swatches.map((color, index) => (
        <span key={`${color.hex}-${index}`} className="w-5 flex-1" style={{ background: color.hex }} />
      ))}
    </span>
  );
}

function CanvasBadge({ src }: { src?: string }) {
  if (!src) return null;
  return (
    <span className="absolute bottom-3 right-3 grid h-10 w-10 overflow-hidden rounded-[10px] border-2 border-[var(--card-2)] bg-[var(--card)] shadow-md">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Latest canvas check-in" className="h-full w-full object-cover" />
      <span className="absolute bottom-1 right-1 grid h-4 w-4 place-items-center rounded-full bg-black/60 text-white" aria-hidden>
        <Icon name="camera" size={9} strokeWidth={2} />
      </span>
    </span>
  );
}

/** The painter's project home: continue work, review progress, and manage saved studies. */
export function HistoryGrid({ authed }: { authed: boolean }) {
  const { items, loading, error, remove, rename } = useHistory(authed);
  const router = useRouter();
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [shots, setShots] = useState<Record<string, string>>({});
  const [canvases, setCanvases] = useState<Record<string, CanvasSpec>>({});

  useEffect(() => {
    let current = true;
    const canvasByProject: Record<string, CanvasSpec> = {};
    for (const project of items) {
      const canvas = project.canvas ?? readProjectWorkspace(project.id)?.canvas;
      if (canvas) canvasByProject[project.id] = canvas;
    }
    Promise.all(
      items.map(async (project) => [project.id, await getShot(project.id)] as const),
    )
      .then((entries) => {
        if (!current) return;
        setCanvases(canvasByProject);
        setShots(
          Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => Boolean(entry[1]))),
        );
      })
      .catch(() => {
        if (current) setShots({});
      });
    return () => {
      current = false;
    };
  }, [items]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = normalized
      ? items.filter((project) => displayProjectName(project.name).toLowerCase().includes(normalized))
      : [...items];

    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  }, [items, query]);

  const projectGroups = useMemo(() => groupProjectsByDate(visible), [visible]);

  const completedSteps = items.reduce(
    (total, project) => total + Math.min(new Set(project.done).size, project.palette.length),
    0,
  );
  const totalSteps = items.reduce((total, project) => total + project.palette.length, 0);
  const overallProgress = totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const openProject = (id: string) => router.push(`/studio?open=${encodeURIComponent(id)}`);

  return (
    <div className="space-y-5">
      <header className="pt-1">
        <h1 className="ui-page-title">Projects</h1>
        {!loading && !error && items.length > 0 && (
          <p className="mt-1.5 flex items-center gap-2 text-[12px] text-[var(--ink-soft)]">
            <span>{items.length} {items.length === 1 ? "painting" : "paintings"}</span>
            <span className="h-1 w-1 rounded-full bg-[var(--line)]" aria-hidden />
            <span>{overallProgress}% complete</span>
          </p>
        )}
      </header>

      {loading ? (
        <div className="space-y-4">
          <div className="h-5 w-24 overflow-hidden rounded-full bg-[var(--paper-2)]">
            <div className="shimmer h-full w-full" />
          </div>
          <div className="-mx-5 flex gap-4 overflow-hidden px-5 pb-2">
            {[0, 1].map((item) => (
              <div key={item} className="w-[80vw] max-w-[296px] flex-none">
                <div className="aspect-[4/3] overflow-hidden rounded-[20px] bg-[var(--paper-2)]">
                  <div className="shimmer h-full w-full" />
                </div>
                <div className="mt-3 h-4 w-2/3 overflow-hidden rounded-full bg-[var(--paper-2)]">
                  <div className="shimmer h-full w-full" />
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--paper-2)]">
                  <div className="shimmer h-full w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="rounded-[18px] border border-[var(--accent)] bg-[var(--card)] p-4 text-[13px]">
          <div className="flex items-center gap-3">
            <Icon name="help" size={19} className="flex-none text-[var(--accent)]" />
            <span>
              <b>{error}</b> <span className="text-[var(--ink-soft)]">Refresh the page to try again.</span>
            </span>
          </div>
        </div>
      ) : items.length === 0 ? (
        <section className="grid min-h-[52vh] place-items-center py-8 text-center">
          <div>
            <div className="relative mx-auto h-24 w-28" aria-hidden>
              <span className="absolute left-2 top-3 h-20 w-20 -rotate-6 rounded-[18px] border border-[var(--line)] bg-[var(--paper-2)]" />
              <span className="absolute right-1 top-1 grid h-20 w-20 rotate-3 place-items-center rounded-[18px] border border-[var(--line)] bg-[var(--card-2)] text-[var(--accent)] shadow-[var(--shadow-sm)]">
                <Icon name="imagePlus" size={29} />
              </span>
            </div>
            <h2 className="ui-section-title mt-4">Your paintings will live here</h2>
            <p className="ui-body mx-auto mt-2 max-w-[28ch] text-[var(--ink-soft)]">
              Tap the center plus to begin with a photo.
            </p>
          </div>
        </section>
      ) : (
        <>
          <div>
            <label className="relative block">
              <Icon
                name="search"
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find a project"
                aria-label="Find a project"
                className="w-full rounded-[14px] border border-[var(--line)] bg-[var(--card)] py-2.5 pl-9 pr-3 text-[13px] outline-none transition-colors placeholder:text-[var(--ink-soft)] focus:border-[var(--accent)]"
              />
            </label>
          </div>

          {projectGroups.length > 0 ? (
            <div className="space-y-7">
              {projectGroups.map((group) => (
                <section key={group.key}>
                  <div className="mb-3 flex items-center gap-3">
                    <h2 className="text-[17px] font-bold tracking-[-0.01em]">{group.label}</h2>
                    <span className="h-px flex-1 bg-[var(--line)]" aria-hidden />
                  </div>
                  <div
                    role="list"
                    aria-label={`${group.label} projects`}
                    className="project-rail -mx-5 flex gap-4 overflow-x-auto pb-3 pl-5 pr-12 scroll-px-5"
                  >
                    {group.projects.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        canvas={canvases[project.id]}
                        shot={shots[project.id]}
                        menuOpen={menuFor === project.id}
                        onOpen={() => openProject(project.id)}
                        onMenu={() => setMenuFor(menuFor === project.id ? null : project.id)}
                        onRename={() => {
                          setMenuFor(null);
                          const next = window.prompt("Rename project", displayProjectName(project.name));
                          if (next?.trim()) void rename(project.id, next.trim());
                        }}
                        onDelete={() => {
                          setMenuFor(null);
                          if (window.confirm(`Delete "${displayProjectName(project.name)}"?`)) void remove(project.id);
                        }}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="rounded-[18px] border border-dashed border-[var(--line)] px-5 py-10 text-center">
              <Icon name="search" size={24} className="mx-auto text-[var(--ink-soft)]" />
              <p className="mt-2 text-[13px] font-bold">No project matches &quot;{query}&quot;</p>
              <button type="button" onClick={() => setQuery("")} className="mt-2 text-[12px] font-semibold text-[var(--accent)]">
                Clear search
              </button>
            </div>
          )}
        </>
      )}

    </div>
  );
}

function ProjectCard({
  project,
  canvas,
  shot,
  menuOpen,
  onOpen,
  onMenu,
  onRename,
  onDelete,
}: {
  project: HistoryProject;
  canvas?: CanvasSpec;
  shot?: string;
  menuOpen: boolean;
  onOpen: () => void;
  onMenu: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const progress = progressFor(project);
  const displayName = displayProjectName(project.name);
  return (
    <article
      role="listitem"
      className={`relative w-[80vw] max-w-[296px] flex-none snap-start ${
        menuOpen ? "z-20" : ""
      }`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="group block w-full text-left transition-transform duration-200 active:scale-[0.99]"
        title={`Open ${displayName}`}
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] border border-[var(--line)] bg-[var(--paper-2)] shadow-[var(--shadow-sm)] transition-shadow duration-200 group-hover:shadow-[var(--shadow)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={project.thumbDataUrl}
            alt={displayName}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="h-full w-full select-none object-cover transition-transform duration-300 group-hover:scale-[1.025]"
          />
          <CanvasBadge src={shot} />
        </div>
        <div className="px-0.5 pt-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 flex-1 truncate text-[15px] font-bold leading-tight tracking-[-0.01em]">
              {displayName}
            </h3>
            <span className="flex-none text-[11px] font-semibold tabular-nums text-[var(--ink-soft)]">
              {progress === 100 ? "Complete" : `${progress}%`}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2.5">
            <PaletteStrip project={project} />
            <span className="flex-none text-[10px] font-medium text-[var(--ink-soft)]">
              {canvas ? `${formatCanvasSize(canvas)} · ` : ""}{project.palette.length} colors
            </span>
          </div>
          <div
            className="project-paint-track mt-2.5"
            role="progressbar"
            aria-label={`${displayName} progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <span className="project-paint-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </button>

      <button
        type="button"
        aria-label={`Project options for ${displayName}`}
        aria-expanded={menuOpen}
        onClick={onMenu}
        className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-black/50 text-white shadow-sm backdrop-blur-md transition-colors hover:bg-black/65"
      >
        <Icon name="more" size={17} />
      </button>

      {menuOpen && (
        <div className="absolute right-2.5 top-12 z-10 w-[132px] rounded-xl border border-[var(--line)] bg-[var(--card-2)] p-1.5 shadow-[var(--shadow)]">
          <button type="button" onClick={onOpen} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold hover:bg-[var(--paper-2)]">
            <Icon name="maximize" size={14} /> Open
          </button>
          <button type="button" onClick={onRename} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold hover:bg-[var(--paper-2)]">
            <Icon name="edit" size={14} /> Rename
          </button>
          <button type="button" onClick={onDelete} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold text-[var(--accent)] hover:bg-[var(--paper-2)]">
            <Icon name="trash" size={14} /> Delete
          </button>
        </div>
      )}
    </article>
  );
}
