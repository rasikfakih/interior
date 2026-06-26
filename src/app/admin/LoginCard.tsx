"use client";

import { useEffect, useState } from "react";

/**
 * LoginCard renders NextAuth's credentials-signin form.
 *
 * How csrf works in NextAuth v4 (verified from
 * node_modules/next-auth/src/core/lib/csrf-token.ts):
 *   1. /api/auth/csrf sets a cookie `__Host-next-auth.csrf-token`
 *      (under HTTPS) with value `<token>|<sha256(token + secret)>`.
 *   2. The form must POST the bare `<token>` (NOT the cookie
 *      value, NOT the cookie URL-encoded). See csrf-token.ts:41:
 *        csrfTokenVerified = isPost && csrfToken === bodyValue
 *      `csrfToken` here is the LEFT half of the cookie's
 *      pipe-split; `bodyValue` is whatever came in the form.
 *   3. The credentials callback reads the cookie, splits on
 *      '|', recomputes the hash, and verifies.
 *
 * What the form MUST do:
 *   - Have the csrf cookie SET in the browser before submit.
 *   - Submit the bare token string (64-char hex).
 *
 * Consequence for this component:
 *   - First mount: hit /api/auth/csrf so the browser receives
 *     the Set-Cookie response. The JSON body still tells us
 *     the bare token, so we do not need a second round-trip
 *     even though the cookie is HttpOnly.
 *   - Race: /api/auth/csrf may not have completed before the
 *     user submits. Signing in is disabled until the token
 *     arrives so the form is never liable for the cookie
 *     mismatch case.
 */
export default function LoginCard() {
  const [csrfToken, setCsrfToken] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/csrf", { credentials: "same-origin" })
      .then((r) => r.json() as Promise<{ csrfToken: string }>)
      .then((j) => {
        if (!cancelled && j?.csrfToken) setCsrfToken(j.csrfToken);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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
          <button type="submit" className="btn-primary w-full" disabled={!csrfToken}>
            Sign in
          </button>
        </form>
      </div>
    </section>
  );
}
