import { getCsrfToken } from "next-auth/react";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function LoginCard() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("next-auth.csrf-token");
  const token = await getCsrfToken();
  const csrfToken = cookie
    ? decodeURIComponent(cookie.value)
    : (token || "");

  return (
    <section className="min-h-[80dvh] flex items-center px-4">
      <div className="container-page max-w-md w-full">
        <form
          className="space-y-6"
          action="/api/auth/callback/credentials"
          method="POST"
        >
          <h1 className="text-4xl tracking-tighter">Sign in</h1>
          <p className="text-ink-mute text-sm">
            Use the seeded admin credentials. Loss of password requires
            editing the SQLite users row manually or issuing a new admin
            via the operator console once Vercel writes are wired in.
          </p>
          <input type="hidden" name="csrfToken" value={csrfToken} readOnly />
          <label className="block">
            <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
              Email
            </span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              className="input-line"
            />
          </label>
          <label className="block">
            <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
              Password
            </span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              className="input-line"
            />
          </label>
          <button type="submit" className="btn-primary w-full">
            Sign in
          </button>
        </form>
      </div>
    </section>
  );
}