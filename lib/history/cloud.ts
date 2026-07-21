import { createClient } from "@/lib/supabase/client";
import type { HistoryProject } from "./types";

interface ProjectRow {
  id: string;
  name: string;
  color_count: number;
  palette: HistoryProject["palette"];
  mixer: HistoryProject["mixer"];
  done: number[] | null;
  thumb: string;
  created_at: string;
}

function rowToProject(row: ProjectRow): HistoryProject {
  return {
    id: row.id,
    name: row.name,
    colorCount: row.color_count,
    palette: row.palette ?? [],
    mixer: row.mixer ?? [],
    done: row.done ?? [],
    thumbDataUrl: row.thumb ?? "",
    createdAt: new Date(row.created_at).getTime(),
  };
}

export async function cloudList(): Promise<HistoryProject[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ProjectRow[]).map(rowToProject);
}

export async function cloudSave(project: HistoryProject): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { error } = await supabase.from("projects").insert({
    id: project.id,
    user_id: user.id,
    name: project.name,
    color_count: project.colorCount,
    palette: project.palette,
    mixer: project.mixer,
    done: project.done,
    thumb: project.thumbDataUrl,
  });
  if (error) throw error;
}

export async function cloudGet(id: string): Promise<HistoryProject | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? rowToProject(data as ProjectRow) : undefined;
}

export async function cloudUpdate(project: HistoryProject): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("projects")
    .update({
      name: project.name,
      color_count: project.colorCount,
      palette: project.palette,
      mixer: project.mixer,
      done: project.done,
      thumb: project.thumbDataUrl,
    })
    .eq("id", project.id);
  if (error) throw error;
}

export async function cloudUpdateDone(id: string, done: number[]): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("projects").update({ done }).eq("id", id);
  if (error) throw error;
}

export async function cloudRemove(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}

export async function cloudRename(id: string, name: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("projects").update({ name }).eq("id", id);
  if (error) throw error;
}
