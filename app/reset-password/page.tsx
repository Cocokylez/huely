import Link from "next/link";
import { updatePassword } from "@/app/auth/actions";
import { getUser } from "@/lib/supabase/server";

const input =
  "w-full rounded-xl border border-[var(--line)] bg-[var(--card-2)] px-3.5 py-2.5 text-[15px] text-[var(--ink)] outline-none focus:border-[var(--accent)]";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, user] = await Promise.all([searchParams, getUser()]);

  if (!user) {
    return (
      <div className="mx-auto max-w-sm py-10 text-center">
        <h1 className="text-[24px] font-extrabold tracking-[-0.02em]">Reset link needed</h1>
        <p className="mx-auto mt-2 max-w-[34ch] text-[14px] leading-relaxed text-[var(--ink-soft)]">
          Open the latest password-reset link from your email. It may have expired or already been
          used.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-block rounded-xl bg-[var(--accent)] px-5 py-3 text-[14px] font-semibold text-white"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm py-8">
      <span
        className="inline-block h-4 w-4 rounded-full"
        style={{ background: "radial-gradient(circle at 35% 30%, var(--accent-soft), var(--accent) 72%)" }}
        aria-hidden
      />
      <h1 className="mt-3 text-[26px] font-extrabold tracking-[-0.02em]">Choose a new password</h1>
      <p className="mt-1 text-[13px] text-[var(--ink-soft)]">
        Updating the password for {user.email}.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-[var(--accent)] px-3.5 py-2.5 text-[13px] text-[var(--ink)]"
          style={{ background: "color-mix(in srgb, var(--accent) 6%, var(--card))" }}
        >
          {error}
        </p>
      )}

      <form action={updatePassword} className="mt-5 flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          New password
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoFocus
            autoComplete="new-password"
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          Confirm new password
          <input
            type="password"
            name="confirmation"
            required
            minLength={8}
            autoComplete="new-password"
            className={input}
          />
        </label>
        <p className="text-[12px] text-[var(--ink-soft)]">Use at least 8 characters.</p>
        <button
          type="submit"
          className="rounded-xl bg-[var(--accent)] px-4 py-3 text-[14px] font-semibold text-white active:scale-[0.98]"
        >
          Save new password
        </button>
      </form>
    </div>
  );
}
