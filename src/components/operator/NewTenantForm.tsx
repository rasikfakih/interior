"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewTenantForm() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [studio_name, setStudioName] = useState("");
  const [owner_email, setOwnerEmail] = useState("");
  const [domain, setDomain] = useState("");
  const [tier, setTier] = useState<"personal" | "business">("personal");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const r = await fetch("/api/operator/tenants", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, studio_name, owner_email, domain, tier }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) {
        setError(j.error || "failed to create tenant");
        setSubmitting(false);
        return;
      }
      router.push(`/superadmin/tenants/${j.id}`);
      router.refresh();
    } catch {
      setError("network error");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid max-w-xl gap-4 border border-zinc-200 bg-white p-6">
      <Field label="Slug" hint="URL-safe identifier. Avoid spaces.">
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replaceAll(/[^a-z0-9-]/g, "-"))}
          required
          pattern="[a-z0-9\\-]+"
          className="w-full border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-zinc-700 focus:outline-none"
        />
      </Field>
      <Field label="Studio name">
        <input
          type="text"
          value={studio_name}
          onChange={(e) => setStudioName(e.target.value)}
          required
          className="w-full border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-zinc-700 focus:outline-none"
        />
      </Field>
      <Field label="Owner email">
        <input
          type="email"
          value={owner_email}
          onChange={(e) => setOwnerEmail(e.target.value)}
          required
          className="w-full border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-zinc-700 focus:outline-none"
        />
      </Field>
      <Field label="Domain" hint="Defaults to buyer-served domain. Optional.">
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="example.com"
          className="w-full border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-zinc-700 focus:outline-none"
        />
      </Field>
      <Field label="Tier">
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value as "personal" | "business")}
          className="w-full border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-zinc-700 focus:outline-none"
        >
          <option value="personal">Personal</option>
          <option value="business">Business</option>
        </select>
      </Field>

      {error ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-red-700">{error}</p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {submitting ? "Creating..." : "Create tenant"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500 mb-2">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-zinc-500">{hint}</span> : null}
    </label>
  );
}
