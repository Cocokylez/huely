"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useHistory } from "@/lib/hooks/useHistory";
import { getShot } from "@/lib/history/local";
import { displayProjectName } from "@/lib/history/name";
import type { HistoryProject } from "@/lib/history/types";
import { Icon } from "@/components/ui/Icon";

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
  return (
    <span className="flex h-2.5 overflow-hidden rounded-full border border-black/5" aria-hidden>
      {project.palette.map((color, index) => (
        <span key={`${color.hex}-${index}`} className="w-5 flex-1" style={{ background: color.hex }} />
      ))}
    </span>
  );
}

function CanvasBadge({ src }: { src?: string }) {
  if (!src) return null;
  return (
    <span className="absolute bottom-2 right-2 grid h-12 w-12 overflow-hidden rounded-xl border-2 border-white bg-[var(--card)] shadow-md">
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

  useEffect(() => {
    let current = true;
    Promise.all(
      items.map(async (project) => [project.id, await getShot(project.id)] as const),
    )
      .then((entries) => {
        if (!current) return;
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
      </header>

      {!loading && !error && items.length > 0 && (
        <section
          className="grid grid-cols-2 overflow-hidden rounded-[18px] border border-[var(--line)] bg-[var(--card)] shadow-[var(--shadow-sm)]"
          aria-label="Project summary"
        >
          <div className="flex min-h-[112px] flex-col items-center justify-center border-r border-[var(--line)] px-3 py-4 text-center">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--paper-2)] text-[var(--accent)]">
              <Icon name="projects" size={15} />
            </span>
            <strong className="mt-2 text-[28px] font-bold leading-none tabular-nums">{items.length}</strong>
            <span className="mt-1 text-[12px] font-medium text-[var(--ink-soft)]">
              {items.length === 1 ? "Project" : "Projects"}
            </span>
          </div>
          <div className="flex min-h-[112px] flex-col items-center justify-center px-3 py-4 text-center">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--paper-2)] text-[var(--accent-2)]">
              <Icon name="listCheck" size={15} />
            </span>
            <strong className="mt-2 text-[28px] font-bold leading-none tabular-nums">{overallProgress}%</strong>
            <span className="mt-1 text-[12px] font-medium text-[var(--ink-soft)]">Colors complete</span>
          </div>
        </section>
      )}

      {loading ? (
        <div className="space-y-3">
          <div className="h-5 w-24 overflow-hidden rounded-full bg-[var(--paper-2)]">
            <div className="shimmer h-full w-full" />
          </div>
          <div className="-mx-5 flex gap-3 overflow-hidden px-5 pb-2">
            {[0, 1].map((item) => (
              <div
                key={item}
                className="h-[260px] w-[78vw] max-w-[270px] flex-none overflow-hidden rounded-[18px] bg-[var(--paper-2)]"
              >
                <div className="shimmer h-full w-full" />
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
        <section className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-[var(--card)] text-center shadow-[var(--shadow-sm)]">
          <div className="relative grid min-h-[190px] place-items-center bg-[var(--paper-2)] px-6">
            <span className="absolute left-[12%] top-8 h-16 w-16 rounded-full bg-[var(--accent-soft)] opacity-45 blur-2xl" />
            <span className="absolute bottom-5 right-[10%] h-20 w-20 rounded-full bg-[var(--accent-2)] opacity-20 blur-2xl" />
            <span className="relative grid h-20 w-20 place-items-center rounded-[24px] border border-[var(--line)] bg-[var(--card-2)] text-[var(--accent)] shadow-[var(--shadow)]">
              <Icon name="imagePlus" size={32} />
            </span>
          </div>
          <div className="px-6 py-6">
            <h2 className="ui-section-title">Start your first painting</h2>
            <p className="ui-body mx-auto mt-2 max-w-sm text-[var(--ink-soft)]">
              Add a photo to build your reference, palette, and painting order.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--paper-2)] px-4 py-2.5 text-[12px] font-semibold text-[var(--ink-soft)]">
              <Icon name="plus" size={14} className="text-[var(--accent)]" /> Tap the center plus below
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
                className="w-full rounded-full border border-[var(--line)] bg-[var(--card)] py-2.5 pl-9 pr-3 text-[13px] outline-none placeholder:text-[var(--ink-soft)] focus:border-[var(--accent)]"
              />
            </label>
          </div>

          {projectGroups.length > 0 ? (
            <div className="space-y-6">
              {projectGroups.map((group) => (
                <section key={group.key}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h2 className="text-[16px] font-bold">{group.label}</h2>
                    <span className="text-[11px] text-[var(--ink-soft)]">
                      {group.projects.length} {group.projects.length === 1 ? "project" : "projects"}
                    </span>
                  </div>
                  <div
                    role="list"
                    aria-label={`${group.label} projects`}
                    className="project-rail -mx-5 flex gap-3 overflow-x-auto pl-5 pr-10 pb-2 scroll-px-5"
                  >
                    {group.projects.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
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
              <p className="mt-2 text-[13px] font-bold">No project matches “{query}”</p>
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
  shot,
  menuOpen,
  onOpen,
  onMenu,
  onRename,
  onDelete,
}: {
  project: HistoryProject;
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
      className={`relative w-[78vw] max-w-[270px] flex-none snap-start overflow-hidden rounded-[18px] border border-[var(--line)] bg-[var(--card)] shadow-[var(--shadow-sm)] ${
        menuOpen ? "z-10" : ""
      }`}
    >
      <button type="button" onClick={onOpen} className="block w-full text-left" title={`Open ${displayName}`}>
        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--paper-2)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={project.thumbDataUrl}
            alt={displayName}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="h-full w-full select-none object-cover transition duration-300 hover:scale-[1.02]"
          />
          <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
            {progress === 100 ? "Complete" : `${progress}%`}
          </span>
          <CanvasBadge src={shot} />
        </div>
        <div className="p-3">
          <div className="pr-8">
            <h3 className="truncate text-[14px] font-bold">{displayName}</h3>
            <p className="mt-0.5 text-[11px] text-[var(--ink-soft)]">{project.palette.length} colors</p>
          </div>
          <div className="mt-2.5">
            <PaletteStrip project={project} />
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--paper-2)]">
            <div className="h-full rounded-full bg-[var(--accent-2)]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </button>

      <button
        type="button"
        aria-label={`Project options for ${displayName}`}
        aria-expanded={menuOpen}
        onClick={onMenu}
        className="absolute bottom-[45px] right-2 grid h-8 w-8 place-items-center rounded-full border border-[var(--line)] bg-[var(--card-2)] text-[var(--ink-soft)] shadow-sm hover:text-[var(--ink)]"
      >
        <Icon name="more" size={17} />
      </button>

      {menuOpen && (
        <div className="absolute bottom-[80px] right-2 z-10 w-[126px] rounded-xl border border-[var(--line)] bg-[var(--card-2)] p-1.5 shadow-[var(--shadow)]">
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
