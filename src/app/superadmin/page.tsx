"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SuperadminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const r = await fetch("/api/operator/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!r.ok) {
        setError("Invalid credentials.");
        setSubmitting(false);
        return;
      }
      router.push("/superadmin/tenants");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <section className="flex min-h-dvh items-center justify-center px-6">
      <form
        onSubmit={submit}
        className="op-panel w-full max-w-sm p-8"
      >
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
          <span className="font-display text-xl leading-none tracking-tight">
            StudioOS
          </span>
          <span className="ml-1 font-mono text-[9px] uppercase tracking-[0.24em] text-ink-mute">
            Operator
          </span>
        </div>
        <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          Tenant + License Control
        </p>

        <label className="mt-8 block">
          <span className="op-label">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="input-line"
          />
        </label>

        <label className="mt-5 block">
          <span className="op-label">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="input-line"
          />
        </label>

        {error ? (
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--op-bad)]">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary mt-8 w-full justify-center"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </section>
  );
}
