import { getUser } from "@/lib/supabase/server";
import { HistoryGrid } from "@/components/history/HistoryGrid";

export default async function HistoryPage() {
  const user = await getUser();

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold">History</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {user ? "Your saved palettes, synced to your account." : "Palettes saved on this device."}
        </p>
      </div>
      <HistoryGrid authed={!!user} />
    </div>
  );
}
