import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { HistoryGrid } from "@/components/history/HistoryGrid";

export default async function ProjectsHome({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>;
}) {
  const { open } = await searchParams;
  // Preserve project links created before Projects became Huely's home.
  if (open) redirect(`/studio?open=${encodeURIComponent(open)}`);

  const user = await getUser();
  return <HistoryGrid authed={Boolean(user)} />;
}
