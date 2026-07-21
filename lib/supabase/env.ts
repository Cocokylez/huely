/**
 * Supabase public config. Supabase renamed the anon key to "publishable key"
 * (sb_publishable_…) — both work identically and are safe to ship to clients.
 * NEXT_PUBLIC_ vars are inlined at build time, so each name must be referenced
 * literally for Next to substitute it.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = (): boolean => !!SUPABASE_URL && !!SUPABASE_KEY;
