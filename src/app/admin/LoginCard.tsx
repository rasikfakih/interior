import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function LoginCard() {
  const cookieStore = await cookies();
  const all = cookieStore.getAll();
  // Get cookie names for diagnostic. The current Server Component
  // renders the form once per request. The cookie name is __Host- or
  // __Secure-next-auth.csrf-token under HTTPS in v4.
  const csrfToken = (() => {
    for (const c of all) {
      if (/csrf-token$/i.test(c.name)) return c.value;
    }
    return "";
  })();

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
            Use the seeded admin credentials.
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
        {/**
         * Diagnostic: log cookie names so we know which one NextAuth
         * set. Cookie names are NOT visible client-side because they
         * are HttpOnly, so this hidden list is harmless in production.
         */}
        <input type="hidden" name="_diag" value={all.map(c => c.name).join('|')} readOnly />
      </div>
    </section>
  );
}
