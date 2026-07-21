import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_KEY, hasSupabaseConfig } from "./env";

export function hasSupabaseEnv(): boolean {
  return hasSupabaseConfig();
}

/** Server-side Supabase client. `cookies()` is async in Next 16. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL!, SUPABASE_KEY!, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Called from Server Components can throw; safe to ignore because the
          // proxy refreshes the session cookie on every request.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* no-op */
          }
        },
      },
    },
  );
}

export interface HuelyUser {
  id: string;
  email: string;
  displayName: string | null;
}

/** Returns the signed-in user, or null (also null when Supabase isn't configured). */
export async function getUser(): Promise<HuelyUser | null> {
  if (!hasSupabaseEnv()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? "",
    displayName: (user.user_metadata?.display_name as string | undefined) ?? null,
  };
}
