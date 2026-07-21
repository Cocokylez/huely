"use server";

import { redirect } from "next/navigation";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

export async function signUp(formData: FormData) {
  if (!hasSupabaseEnv()) redirect("/signup?error=Supabase%20is%20not%20configured%20yet");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: name } },
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
  const { error } = await supabase.auth.resend({ type: "signup", email });

  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect(`/login?sent=${encodeURIComponent(email)}`);
}

export async function signOut() {
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
