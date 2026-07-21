import Link from "next/link";
import { signIn } from "@/app/auth/actions";

const input =
  "w-full rounded-xl border border-[var(--line)] bg-[var(--card-2)] px-3.5 py-2.5 text-[15px] text-[var(--ink)] outline-none focus:border-[var(--accent)]";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-sm py-8">
      <span
        className="inline-block h-4 w-4 rounded-full"
        style={{ background: "radial-gradient(circle at 35% 30%, var(--accent-soft), var(--accent) 72%)" }}
        aria-hidden
      />
      <h1 className="mt-3 text-[26px] font-extrabold tracking-[-0.02em]">Welcome back</h1>
      <p className="mt-1 text-[13px] text-[var(--ink-soft)]">
        Log in to keep your palettes on every device.
      </p>

      {error && (
        <p
          className="mt-4 rounded-xl border border-[var(--accent)] px-3.5 py-2.5 text-[13px] text-[var(--ink)]"
          style={{ background: "color-mix(in srgb, var(--accent) 6%, var(--card))" }}
        >
          {error}
        </p>
      )}

      <form action={signIn} className="mt-5 flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          Email
          <input type="email" name="email" required autoComplete="email" className={input} />
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          Password
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className={input}
          />
        </label>
        <button
          type="submit"
          className="mt-1 rounded-xl bg-[var(--accent)] px-4 py-3 text-[14px] font-semibold text-white active:scale-[0.98]"
        >
          Log in
        </button>
      </form>

      <p className="mt-4 text-center text-[13px] text-[var(--ink-soft)]">
        No account?{" "}
        <Link href="/signup" className="font-semibold text-[var(--accent)]">
          Sign up
        </Link>
      </p>
      <p className="mt-5 text-center text-[12px] leading-relaxed text-[var(--ink-soft)]">
        You can use Huely without an account — everything stays on your device.
      </p>
    </div>
  );
}
