import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_KEY, hasSupabaseConfig } from "./env";

export function hasSupabase(): boolean {
  return hasSupabaseConfig();
}

/** Browser-side Supabase client (publishable key — safe to ship). */
export function createClient() {
  return createBrowserClient(SUPABASE_URL!, SUPABASE_KEY!);
}
