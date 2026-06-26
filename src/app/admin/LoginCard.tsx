import { getCsrfToken } from "next-auth/react";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function LoginCard() {
  // Calling getCsrfToken() is what populates the csrf cookie via
  // NextAuth's server helper when the request carries no cookie
  // header of its own. The subsequent cookies() read should then
  // return the full cookie value, which is what NextAuth's
  // /api/auth/callback/credentials POST handler verifies against.
  const token = await getCsrfToken();
  const cookieStore = await cookies();
  const cookie =
    cookieStore.get("next-auth.csrf-token")
    || cookieStore.get("__Host-next-auth.csrf-token")
    || cookieStore.get("__Secure-next-auth.csrf-token");
  // The cookie value is <urlEncodedToken>%<urlEncodedHash>. Pass
  // it verbatim to the form. NextAuth's verifier splits on the
  // literal % in the submitted value and compares.
  const csrfToken = cookie?.value || token || "";

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
      </div>
    </section>
  );
}
