import Link from "next/link";
import { signIn } from "@/app/auth/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-sm py-8">
      <h1 className="text-2xl font-bold">Log in</h1>
      <p className="mt-1 text-sm text-neutral-500">Welcome back to Huely.</p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <form action={signIn} className="mt-5 flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Password
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="mt-1 rounded-xl bg-[var(--accent,#c65d3b)] px-4 py-3 text-sm font-semibold text-white"
        >
          Log in
        </button>
      </form>

      <p className="mt-4 text-sm text-neutral-500">
        No account?{" "}
        <Link href="/signup" className="font-semibold text-[var(--accent,#c65d3b)]">
          Sign up
        </Link>
      </p>
    </div>
  );
}
