"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useHistory } from "@/lib/hooks/useHistory";
import { getShot } from "@/lib/history/local";
import type { HistoryProject } from "@/lib/history/types";
import { Icon } from "@/components/ui/Icon";

type ProjectSort = "recent" | "progress" | "oldest";

function progressFor(project: HistoryProject): number {
  if (!project.palette.length) return 0;
  return Math.min(100, Math.round((new Set(project.done).size / project.palette.length) * 100));
}

function startedLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: new Date(timestamp).getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
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
  const [sort, setSort] = useState<ProjectSort>("recent");
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
      ? items.filter((project) => project.name.toLowerCase().includes(normalized))
      : [...items];

    return filtered.sort((a, b) => {
      if (sort === "progress") return progressFor(b) - progressFor(a) || b.createdAt - a.createdAt;
      if (sort === "oldest") return a.createdAt - b.createdAt;
      return b.createdAt - a.createdAt;
    });
  }, [items, query, sort]);

  const completedSteps = items.reduce(
    (total, project) => total + Math.min(new Set(project.done).size, project.palette.length),
    0,
  );
  const totalSteps = items.reduce((total, project) => total + project.palette.length, 0);
  const overallProgress = totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const featured = visible[0];
  const remaining = visible.slice(1);

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
        <div className="grid gap-3">
          <div className="h-[260px] overflow-hidden rounded-[22px] bg-[var(--paper-2)]">
            <div className="shimmer h-full w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[0, 1].map((item) => (
              <div key={item} className="h-[190px] overflow-hidden rounded-[18px] bg-[var(--paper-2)]">
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
          <div className="flex items-center gap-2">
            <label className="relative min-w-0 flex-1">
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
            <label className="relative flex-none">
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as ProjectSort)}
                aria-label="Sort projects"
                className="appearance-none rounded-full border border-[var(--line)] bg-[var(--card)] py-2.5 pl-3 pr-8 text-[12px] font-semibold outline-none focus:border-[var(--accent)]"
              >
                <option value="recent">Newest</option>
                <option value="progress">Progress</option>
                <option value="oldest">Oldest</option>
              </select>
              <Icon
                name="chevronDown"
                size={13}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]"
              />
            </label>
          </div>

          {featured ? (
            <>
              <section>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h2 className="text-[15px] font-bold">Continue painting</h2>
                  <span className="text-[11px] text-[var(--ink-soft)]">{startedLabel(featured.createdAt)}</span>
                </div>
                <article className="overflow-hidden rounded-[22px] border border-[var(--line)] bg-[var(--card)] shadow-[var(--shadow)]">
                  <div className="grid sm:grid-cols-[1.15fr_0.85fr]">
                    <div className="relative min-h-[190px] bg-[var(--paper-2)] sm:min-h-[230px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={featured.thumbDataUrl} alt={featured.name} className="absolute inset-0 h-full w-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 to-transparent" />
                      <CanvasBadge src={shots[featured.id]} />
                    </div>
                    <div className="flex flex-col p-4">
                      <p className="text-[11px] font-semibold text-[var(--accent)]">
                        {progressFor(featured) === 100 ? "Painting complete" : "In progress"}
                      </p>
                      <h3 className="mt-1 truncate text-[18px] font-bold tracking-[-0.015em]">{featured.name}</h3>
                      <p className="mt-1 text-[12px] text-[var(--ink-soft)]">
                        {featured.palette.length} palette colors · {new Set(featured.done).size} finished
                      </p>
                      <div className="mt-3">
                        <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-[var(--ink-soft)]">
                          <span>Painting progress</span>
                          <span>{progressFor(featured)}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[var(--paper-2)]">
                          <div className="h-full rounded-full bg-[var(--accent-2)]" style={{ width: `${progressFor(featured)}%` }} />
                        </div>
                      </div>
                      <div className="mt-3">
                        <PaletteStrip project={featured} />
                      </div>
                      <button
                        type="button"
                        onClick={() => openProject(featured.id)}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-3 text-[13px] font-semibold text-[var(--paper)]"
                      >
                        Open workspace <Icon name="arrowRight" size={15} />
                      </button>
                    </div>
                  </div>
                </article>
              </section>

              {remaining.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-[15px] font-bold">All projects</h2>
                    <span className="text-[11px] text-[var(--ink-soft)]">{remaining.length} more</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
                    {remaining.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        shot={shots[project.id]}
                        menuOpen={menuFor === project.id}
                        onOpen={() => openProject(project.id)}
                        onMenu={() => setMenuFor(menuFor === project.id ? null : project.id)}
                        onRename={() => {
                          setMenuFor(null);
                          const next = window.prompt("Rename project", project.name);
                          if (next?.trim()) void rename(project.id, next.trim());
                        }}
                        onDelete={() => {
                          setMenuFor(null);
                          if (window.confirm(`Delete "${project.name}"?`)) void remove(project.id);
                        }}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
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
  return (
    <article className="relative overflow-hidden rounded-[18px] border border-[var(--line)] bg-[var(--card)] shadow-[var(--shadow-sm)]">
      <button type="button" onClick={onOpen} className="block w-full text-left" title={`Open ${project.name}`}>
        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--paper-2)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={project.thumbDataUrl} alt={project.name} className="h-full w-full object-cover transition duration-300 hover:scale-[1.02]" />
          <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
            {progress}% done
          </span>
          <CanvasBadge src={shot} />
        </div>
        <div className="p-3">
          <div className="pr-8">
            <h3 className="truncate text-[14px] font-bold">{project.name}</h3>
            <p className="mt-0.5 text-[11px] text-[var(--ink-soft)]">
              {startedLabel(project.createdAt)} · {project.palette.length} colors
            </p>
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
        aria-label={`Project options for ${project.name}`}
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
