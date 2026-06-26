"use client";

import { useEffect, useState } from "react";

export default function LoginCard() {
  const [csrfToken, setCsrfToken] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Step 1: hit NextAuth's csrf endpoint to mint the cookie on the
      // client. NextAuth returns 200 with Set-Cookie: __Host-next-auth.csrf-token.
      await fetch("/api/auth/csrf", { credentials: "same-origin" }).catch(() => {});
      if (cancelled) return;
      // Step 2: read the cookie via our read endpoint. The cookie is now
      // present in the browser jar, so cookies() on the server can see it.
      const r = await fetch("/api/auth/cookie-read", { credentials: "same-origin" });
      const j = await r.json() as { cookieValue: string | null };
      if (!cancelled) setCsrfToken(j.cookieValue || "");
    })();
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
          <button type="submit" className="btn-primary w-full" disabled={!csrfToken}>
            Sign in
          </button>
        </form>
      </div>
    </section>
  );
}
