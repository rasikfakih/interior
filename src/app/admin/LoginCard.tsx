"use client";

import { useEffect, useState } from "react";

export default function LoginCard() {
  const [csrfToken, setCsrfToken] = useState("");

  useEffect(() => {
    let cancelled = false;
    // We hit our own route rather than /api/auth/csrf because NextAuth's
    // /api/auth/csrf returns only the token portion. Our route reads the
    // server-side cookie (the full token%hash) and returns it.
    fetch("/api/auth/csrf-full")
      .then((r) => r.json() as Promise<{ csrfToken: string; cookieValue: string | null }>)
      .then((j) => {
        if (cancelled) return;
        // Prefer the full cookie value when available - that is what
        // NextAuth's /api/auth/callback/credentials verifier expects.
        setCsrfToken(j.cookieValue || j.csrfToken || "");
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
