"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TenantUser = {
  id: number;
  email: string;
  role: string;
  is_active: number | boolean;
};

type TenantShape = {
  id: number;
  slug: string;
  studio_name: string;
  owner_email?: string | null;
  domain?: string | null;
  tier: string;
  state: string;
  expires_at?: string | null;
};

export function TenantDetailClient({
  tenant,
  distro,
  users,
}: {
  tenant: TenantShape;
  distro: unknown;
  users?: TenantUser[];
}) {
  const router = useRouter();
  const [studio_name, setStudioName] = useState(tenant.studio_name);
  const [owner_email, setOwnerEmail] = useState(tenant.owner_email || "");
  const [domain, setDomain] = useState(tenant.domain || "");
  const [tier, setTier] = useState(tenant.tier);
  const [state, setState] = useState(tenant.state);
  const [expires_at, setExpiresAt] = useState(tenant.expires_at ? tenant.expires_at.slice(0, 10) : "");

  const [distroJson, setDistroJson] = useState(JSON.stringify(distro || defaultDistro(studio_name), null, 2));
  const [issue, setIssue] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // When the studio slug changes and the tenant has no distro, seed the
  // editor with a default. Render-phase adjustment (React's documented
  // prop-change pattern) instead of setState in an effect. On mount the
  // useState initializer already covers the no-distro case, so this only
  // reacts to later slug changes - and it fixes the latent bug where the
  // old effect wrote an object into the string-typed distroJson state.
  const [prevStudio, setPrevStudio] = useState(studio_name);
  if (prevStudio !== studio_name) {
    setPrevStudio(studio_name);
    if (!distro) setDistroJson(JSON.stringify(defaultDistro(studio_name), null, 2));
  }

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      const body: Record<string, unknown> = { studio_name, owner_email, domain, tier, state, expires_at: expires_at ? new Date(expires_at).toISOString() : null };
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
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="chrome-pill mb-3 inline-flex">Operations</p>
          <h1 className="text-3xl tracking-tighter">Tenant #{tenant.id}</h1>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            {tenant.slug}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={issueLicense}
            disabled={busy}
            className="op-btn-sm"
          >
            Issue license
          </button>
          <button
            type="button"
            onClick={revoke}
            disabled={busy}
            className="op-btn-sm op-btn-sm--danger"
          >
            Revoke
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="op-panel grid gap-4 p-6">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">Tenant record</h2>
          <Field label="Studio name">
            <input type="text" value={studio_name} onChange={(e) => setStudioName(e.target.value)} className="input-line" />
          </Field>
          <Field label="Owner email">
            <input type="email" value={owner_email} onChange={(e) => setOwnerEmail(e.target.value)} className="input-line" />
          </Field>
          <Field label="Domain">
            <input type="text" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com" className="input-line" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tier">
              <select value={tier} onChange={(e) => setTier(e.target.value)} className="input-line">
                <option value="personal">Personal</option>
                <option value="business">Business</option>
              </select>
            </Field>
            <Field label="State">
              <select value={state} onChange={(e) => setState(e.target.value)} className="input-line">
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="revoked">Revoked</option>
              </select>
            </Field>
          </div>
          <Field label="Expires">
            <input type="date" value={expires_at} onChange={(e) => setExpiresAt(e.target.value)} className="input-line" />
          </Field>
        </div>

        <div className="op-panel grid gap-4 p-6">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">Theme distro</h2>
          <p className="text-xs text-ink-soft">JSON applied at install + runtime overlay. See <code className="font-mono">docs/theme-distro.schema.md</code>.</p>
          <textarea
            value={distroJson}
            onChange={(e) => setDistroJson(e.target.value)}
            spellCheck={false}
            className="op-code h-96 w-full resize-y"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-mute">{msg}</p>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="btn-primary h-10 px-5 text-[10px]"
        >
          Save changes
        </button>
      </div>

      {issue ? (
        <div className="op-panel p-6">
          <h2 className="mb-2 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">Issued license payload</h2>
          <pre className="op-code">{JSON.stringify(issue, null, 2)}</pre>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
            Save to data/license.json at the buyer&apos;s install or relay via email.
          </p>
        </div>
      ) : null}

      {users && users.length > 0 ? (
        <div className="op-panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
              Team users ({users.length})
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
              audited · opens /admin as this user
            </span>
          </div>
          <ul className="mt-4 divide-y divide-[var(--line)]">
            {users.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <span className="text-sm font-medium text-ink">{u.email}</span>
                  <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
                    {u.role} · {Number(u.is_active) === 1 || u.is_active === true ? "active" : "off"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const r = await fetch("/api/operator/login-as", {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ user_id: u.id }),
                      });
                      const j = await r.json();
                      if (!r.ok) {
                        setMsg(j.error || "login-as failed");
                        return;
                      }
                      window.open("/admin", "_blank");
                    } catch (e) {
                      setMsg((e as Error).message);
                    }
                  }}
                  className="op-btn-sm"
                >
                  Login as
                </button>
              </li>
            ))}
          </ul>
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
      <span className="op-label">{label}</span>
      {children}
    </label>
  );
}
