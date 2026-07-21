import { createClient } from "@/lib/supabase/client";
import type { HistoryProject } from "./types";

interface ProjectRow {
  id: string;
  name: string;
  color_count: number;
  palette: HistoryProject["palette"];
  mixer: HistoryProject["mixer"];
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
    user_id: user.id,
    name: project.name,
    color_count: project.colorCount,
    palette: project.palette,
    mixer: project.mixer,
    thumb: project.thumbDataUrl,
  });
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
