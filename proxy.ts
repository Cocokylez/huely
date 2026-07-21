import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_KEY } from "@/lib/supabase/env";

/**
 * Next.js 16 renamed `middleware` to `proxy` (nodejs runtime). This refreshes
 * the Supabase auth session cookie on each request. No-ops when Supabase env
 * vars are absent, so the app runs fine in guest mode.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = SUPABASE_URL;
  const key = SUPABASE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
