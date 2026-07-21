import { StudioClient } from "@/components/studio/StudioClient";
import { getUser } from "@/lib/supabase/server";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>;
}) {
  const [user, { open }] = await Promise.all([getUser(), searchParams]);
  return <StudioClient authed={!!user} openId={open} />;
}
