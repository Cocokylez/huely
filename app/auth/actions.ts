"use server";

import { redirect } from "next/navigation";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

export async function signUp(formData: FormData) {
  if (!hasSupabaseEnv()) redirect("/signup?error=Supabase%20is%20not%20configured%20yet");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: name } },
  });

  if (error) redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  redirect("/");
}

export async function signIn(formData: FormData) {
  if (!hasSupabaseEnv()) redirect("/login?error=Supabase%20is%20not%20configured%20yet");

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/");
}

export async function signOut() {
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
