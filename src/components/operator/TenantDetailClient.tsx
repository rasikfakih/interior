"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export function TenantDetailClient({ tenant, distro }: { tenant: any; distro: any }) {
  const router = useRouter();
  const [studio_name, setStudioName] = useState(tenant.studio_name);
  const [owner_email, setOwnerEmail] = useState(tenant.owner_email || "");
  const [domain, setDomain] = useState(tenant.domain || "");
  const [tier, setTier] = useState(tenant.tier);
  const [state, setState] = useState(tenant.state);
  const [expires_at, setExpiresAt] = useState(tenant.expires_at ? tenant.expires_at.slice(0, 10) : "");

  const [distroJson, setDistroJson] = useState(JSON.stringify(distro || defaultDistro(studio_name), null, 2));
  const [issue, setIssue] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!distro) setDistroJson((s) => defaultDistro(studio_name) as any);
  }, [studio_name]);

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      const body: any = { studio_name, owner_email, domain, tier, state, expires_at: expires_at ? new Date(expires_at).toISOString() : null };
      try { body.distro = JSON.parse(distroJson); } catch { setMsg("distro JSON invalid"); setBusy(false); return; }
      const r = await fetch(`/api/operator/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) { setMsg("save failed"); setBusy(false); return; }
      setMsg("saved");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (!confirm(`Revoke tenant ${tenant.slug}? This blocks admin and tier features immediately.`)) return;
    setBusy(true);
    try {
      await fetch(`/api/operator/tenants/${tenant.id}?revoke=1`, { method: "DELETE" });
      setMsg("revoked");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function issueLicense() {
    setBusy(true);
    setIssue(null);
    try {
      const r = await fetch(`/api/operator/issue`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenant_id: tenant.id }),
      });
      const j = await r.json();
      if (!r.ok) { setMsg(j.error || "issue failed"); }
      else { setIssue(j.license); }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-8">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl tracking-tight text-zinc-900">Tenant #{tenant.id}</h1>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
            {tenant.slug}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={issueLicense}
            disabled={busy}
            className="border border-zinc-300 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-700 hover:border-zinc-700 hover:text-zinc-900"
          >
            Issue license
          </button>
          <button
            type="button"
            onClick={revoke}
            disabled={busy}
            className="border border-red-300 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-red-700 hover:border-red-700 hover:text-red-900"
          >
            Revoke
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="grid gap-4 border border-zinc-200 bg-white p-6">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500">Tenant record</h2>
          <Field label="Studio name">
            <input type="text" value={studio_name} onChange={(e) => setStudioName(e.target.value)} className="w-full border border-zinc-300 px-3 py-2 focus:border-zinc-700 focus:outline-none" />
          </Field>
          <Field label="Owner email">
            <input type="email" value={owner_email} onChange={(e) => setOwnerEmail(e.target.value)} className="w-full border border-zinc-300 px-3 py-2 focus:border-zinc-700 focus:outline-none" />
          </Field>
          <Field label="Domain">
            <input type="text" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com" className="w-full border border-zinc-300 px-3 py-2 focus:border-zinc-700 focus:outline-none" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tier">
              <select value={tier} onChange={(e) => setTier(e.target.value)} className="w-full border border-zinc-300 px-3 py-2 focus:border-zinc-700 focus:outline-none">
                <option value="personal">Personal</option>
                <option value="business">Business</option>
              </select>
            </Field>
            <Field label="State">
              <select value={state} onChange={(e) => setState(e.target.value)} className="w-full border border-zinc-300 px-3 py-2 focus:border-zinc-700 focus:outline-none">
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="revoked">Revoked</option>
              </select>
            </Field>
          </div>
          <Field label="Expires">
            <input type="date" value={expires_at} onChange={(e) => setExpiresAt(e.target.value)} className="w-full border border-zinc-300 px-3 py-2 focus:border-zinc-700 focus:outline-none" />
          </Field>
        </div>

        <div className="grid gap-4 border border-zinc-200 bg-white p-6">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500">Theme distro</h2>
          <p className="text-xs text-zinc-500">JSON applied at install + runtime overlay. See <code className="font-mono">docs/theme-distro.schema.md</code>.</p>
          <textarea
            value={distroJson}
            onChange={(e) => setDistroJson(e.target.value)}
            spellCheck={false}
            className="h-96 w-full resize-y border border-zinc-300 bg-zinc-50 p-3 font-mono text-xs text-zinc-900 focus:border-zinc-700 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">{msg}</p>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          Save changes
        </button>
      </div>

      {issue ? (
        <div className="border border-zinc-200 bg-white p-6">
          <h2 className="mb-2 font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500">Issued license payload</h2>
          <pre className="overflow-x-auto bg-zinc-50 p-4 font-mono text-xs text-zinc-800">{JSON.stringify(issue, null, 2)}</pre>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Save to data/license.json at the buyer's install or relay via email.
          </p>
        </div>
      ) : null}
    </section>
  );
}

function defaultDistro(studio: string) {
  return {
    brand_name: studio,
    tagline: "A studio of considered spaces.",
    palette: { ink: "#1a1814", paper: "#efe6d2", accent: "#8a5d3b", muted: "#7a6e58" },
    default_locales: ["en"],
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500 mb-2">{label}</span>
      {children}
    </label>
  );
}
