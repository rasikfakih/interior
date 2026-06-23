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
    <section className="min-h-[80dvh] flex items-center justify-center px-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm border border-zinc-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-2xl tracking-tight text-zinc-900">Superadmin</h1>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
          Tenant + License Control
        </p>

        <label className="mt-6 block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500 mb-2">
            Email
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-zinc-700 focus:outline-none"
          />
        </label>

        <label className="mt-4 block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500 mb-2">
            Password
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-zinc-700 focus:outline-none"
          />
        </label>

        {error ? (
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </section>
  );
}
