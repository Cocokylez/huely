"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

async function getSiteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  if (origin) return origin;

  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) return "https://huely.vercel.app";

  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${protocol}://${host}`;
}

export async function signUp(formData: FormData) {
  if (!hasSupabaseEnv()) redirect("/signup?error=Supabase%20is%20not%20configured%20yet");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: name },
      emailRedirectTo: `${await getSiteOrigin()}/auth/callback?next=/`,
    },
  });

  if (error) redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  // Email confirmation off → a session is returned and the user is logged in.
  if (data.session) redirect("/");
  // Confirmation on → no session yet; tell them to check their inbox.
  redirect(`/signup?pending=${encodeURIComponent(email)}`);
}

export async function signIn(formData: FormData) {
  if (!hasSupabaseEnv()) redirect("/login?error=Supabase%20is%20not%20configured%20yet");

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Surface the email on "not confirmed" so the page can offer a resend.
    const unconfirmed = /confirm/i.test(error.message);
    const suffix = unconfirmed ? `&email=${encodeURIComponent(email)}` : "";
    redirect(`/login?error=${encodeURIComponent(error.message)}${suffix}`);
  }
  redirect("/");
}

export async function resendConfirmation(formData: FormData) {
  if (!hasSupabaseEnv()) redirect("/login?error=Supabase%20is%20not%20configured%20yet");

  const email = String(formData.get("email") ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${await getSiteOrigin()}/auth/callback?next=/` },
  });

  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect(`/login?sent=${encodeURIComponent(email)}`);
}

export async function requestPasswordReset(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirect("/forgot-password?error=Supabase%20is%20not%20configured%20yet");
  }

  const email = String(formData.get("email") ?? "").trim();
  if (!email) redirect("/forgot-password?error=Enter%20your%20email%20address");

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await getSiteOrigin()}/auth/callback?next=/reset-password`,
  });

  if (error) redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`);
  redirect(`/forgot-password?sent=${encodeURIComponent(email)}`);
}

export async function updatePassword(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirect("/reset-password?error=Supabase%20is%20not%20configured%20yet");
  }

  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (password.length < 8) {
    redirect("/reset-password?error=Use%20at%20least%208%20characters");
  }
  if (password !== confirmation) {
    redirect("/reset-password?error=Passwords%20do%20not%20match");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/forgot-password?error=That%20reset%20link%20is%20invalid%20or%20expired");
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);

  await supabase.auth.signOut();
  redirect("/login?reset=1");
}

export async function signOut() {
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
