import Link from "next/link";
import { requestPasswordReset } from "@/app/auth/actions";
import { Icon } from "@/components/ui/Icon";

const input =
  "w-full rounded-xl border border-[var(--line)] bg-[var(--card-2)] px-3.5 py-2.5 text-[15px] text-[var(--ink)] outline-none focus:border-[var(--accent)]";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;

  if (sent) {
    return (
      <div className="mx-auto max-w-sm py-10 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--card-2)] text-2xl" aria-hidden>
          <Icon name="mail" size={24} />
        </div>
        <h1 className="mt-4 text-[24px] font-extrabold tracking-[-0.02em]">Check your email</h1>
        <p className="mx-auto mt-2 max-w-[34ch] text-[14px] leading-relaxed text-[var(--ink-soft)]">
          If an account exists for <b className="text-[var(--ink)]">{sent}</b>, we sent a secure
          link to choose a new password.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-xl bg-[var(--accent)] px-5 py-3 text-[14px] font-semibold text-white"
        >
          Back to log in
        </Link>
        <p className="mt-4 text-[12px] text-[var(--ink-soft)]">
          No email yet? Check spam or try again in a minute.
        </p>
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
      <h1 className="mt-3 text-[26px] font-extrabold tracking-[-0.02em]">Reset your password</h1>
      <p className="mt-1 text-[13px] leading-relaxed text-[var(--ink-soft)]">
        Enter the email you use for Huely. We’ll send you a secure reset link.
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

      <form action={requestPasswordReset} className="mt-5 flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          Email
          <input
            type="email"
            name="email"
            required
            autoFocus
            autoComplete="email"
            className={input}
          />
        </label>
        <button
          type="submit"
          className="mt-1 rounded-xl bg-[var(--accent)] px-4 py-3 text-[14px] font-semibold text-white active:scale-[0.98]"
        >
          Send reset link
        </button>
      </form>

      <p className="mt-5 text-center text-[13px] text-[var(--ink-soft)]">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-[var(--accent)]">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
