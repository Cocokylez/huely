import { StudioClient } from "@/components/studio/StudioClient";
import { getUser } from "@/lib/supabase/server";

export default async function CreatePage() {
  const user = await getUser();
  return <StudioClient authed={Boolean(user)} />;
}
