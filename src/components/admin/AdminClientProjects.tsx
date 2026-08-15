"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  clientProjectStatusLabel,
  formatRupees,
  relativeTime,
  type ClientProjectDto,
} from "@/lib/proposals";
import { IconPlus } from "@/components/icons";

type Toast = { kind: "ok" | "err"; msg: string };

const INPUT_CLS =
  "w-full bg-canvas border hairline rounded-[var(--radius-control)] px-3 py-2 text-sm focus:border-[var(--accent-deep)] focus:outline-none";

export default function AdminClientProjects({ role }: { role: string }) {
  const [projects, setProjects] = useState<ClientProjectDto[]>([]);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  function showToast(kind: Toast["kind"], msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2400);
  }

  async function load() {
    setBusy(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      const r = await fetch(`/api/client-projects?${params}`, {
        credentials: "include",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast("err", j.error || `Load failed (${r.status})`);
        return;
      }
      setProjects(j.projects ?? []);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-end">
        <div className="md:col-span-9">
          <p className="chrome-pill mb-3 inline-flex">Client engagements</p>
          <h1 className="text-3xl md:text-5xl tracking-tighter">Projects.</h1>
          <p className="text-ink-mute text-sm mt-2">
            Every engagement starts from a lead. Create a project from the
            lead board or the inbox, then generate a proposal link to send
            the client. Role: <span className="font-mono text-xs">{role}</span>.
          </p>
        </div>
        <div className="md:col-span-3 flex md:justify-end">
          <Link href="/admin/client-projects/new" className="btn-primary">
            <IconPlus size={14} aria-hidden /> New project
          </Link>
        </div>
      </header>

      {toast && (
        <div
          role="status"
          className="surface-elevated px-4 py-3 text-sm rounded-[var(--radius-card)] text-accent-deep"
        >
          {toast.msg}
        </div>
      )}

      <div className="surface-tile p-4 rounded-[var(--radius-card)]">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-8">
            <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a] mb-2">
              Search by project, client or lead
            </label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") load();
              }}
              placeholder="Name, client, email..."
              className={INPUT_CLS}
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="button"
              onClick={load}
              disabled={busy}
              className="btn-ghost w-full"
            >
              {busy ? "Loading..." : "Search"}
            </button>
          </div>
          <div className="md:col-span-2 text-right">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#56605a]">
              {projects.length} project{projects.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>

      <div className="surface-tile overflow-x-auto rounded-[var(--radius-card)]">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b hairline">
            <tr>
              {["name", "client", "lead", "status", "budget", "area", "created", ""].map(
                (h) => (
                  <th
                    key={h || "action"}
                    className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y hairline">
            {projects.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-ink-mute">
                  {busy ? "Loading..." : "No client projects yet. Create one from a lead."}
                </td>
              </tr>
            )}
            {projects.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3">{p.clientName || "-"}</td>
                <td className="px-4 py-3 font-mono text-xs">{p.leadName || "-"}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-[var(--radius-control)] border border-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-accent-deep">
                    {clientProjectStatusLabel(p.status)}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {formatRupees(p.budget)}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {p.areaSqft ? `${Math.round(p.areaSqft)} sqft` : "-"}
                </td>
                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                  {relativeTime(p.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/client-projects/${p.id}`}
                    className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent-deep hover:underline"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
