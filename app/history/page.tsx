import { getUser } from "@/lib/supabase/server";
import { HistoryGrid } from "@/components/history/HistoryGrid";

export default async function HistoryPage() {
  const user = await getUser();
  return <HistoryGrid authed={!!user} />;
}
