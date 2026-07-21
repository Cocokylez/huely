import Link from "next/link";
import { signUp } from "@/app/auth/actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-sm py-8">
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="mt-1 text-sm text-neutral-500">Save your palettes and history.</p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <form action={signUp} className="mt-5 flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Name
          <input
            type="text"
            name="name"
            required
            autoComplete="name"
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2"
          />
        </label>
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
            minLength={6}
            autoComplete="new-password"
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="mt-1 rounded-xl bg-[var(--accent,#c65d3b)] px-4 py-3 text-sm font-semibold text-white"
        >
          Sign up
        </button>
      </form>

      <p className="mt-4 text-sm text-neutral-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[var(--accent,#c65d3b)]">
          Log in
        </Link>
      </p>
    </div>
  );
}
