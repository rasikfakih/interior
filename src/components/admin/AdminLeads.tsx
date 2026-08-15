"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  leadSourceLabel,
  leadStatusLabel,
  type LeadDto,
} from "@/lib/leads";
import PlanLimitModal from "./PlanLimitModal";

type Stats = Record<string, number>;

type Toast = { kind: "ok" | "err"; msg: string };

const INPUT_CLS =
  "w-full bg-canvas border hairline rounded-[var(--radius-control)] px-3 py-2 text-sm focus:border-[var(--accent-deep)] focus:outline-none";

const LABEL_CLS =
  "font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute";

function fmtDate(s: string | null): string {
  if (!s) return "-";
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toISOString().slice(0, 10);
  } catch {
    return s;
  }
}

function emptyStats(): Stats {
  const out: Stats = {};
  for (const s of LEAD_STATUSES) out[s] = 0;
  return out;
}

const STAT_CARDS: { key: string; label: string }[] = [
  { key: "new", label: "New" },
  { key: "qualified", label: "Qualified" },
  { key: "quote_sent", label: "Quote sent" },
  { key: "won", label: "Won" },
];

export default function AdminLeads({ role }: { role: string }) {
  const [rows, setRows] = useState<LeadDto[]>([]);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  function showToast(kind: Toast["kind"], msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2400);
  }

  async function load() {
    setBusy(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (source) params.set("source", source);
      if (search.trim()) params.set("q", search.trim());
      params.set("limit", "500");
      const r = await fetch(`/api/leads?${params.toString()}`, {
        credentials: "include",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast("err", j.error || `Load failed (${r.status})`);
        return;
      }
      setRows(j.leads ?? []);
      setStats(j.stats ?? emptyStats());
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Quick status move: optimistic row update, then the shared status
   *  API; on failure revert the row and refresh the funnel stats. */
  async function moveTo(id: number, newStatus: string) {
    const snapshot = rows;
    const row = rows.find((r) => r.id === id);
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: newStatus, lastStatusChangeAt: new Date().toISOString() }
          : r
      )
    );
    try {
      const r = await fetch(`/api/leads/${id}/status`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setRows(snapshot);
        showToast("err", j.error || `Move failed (${r.status})`);
        return;
      }
      showToast("ok", `${row?.name ?? "Lead"} moved to ${leadStatusLabel(newStatus)}.`);
      load();
    } catch {
      setRows(snapshot);
      showToast("err", "Network problem. Move not saved.");
    }
  }

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-end">
        <div className="md:col-span-8">
          <p className="chrome-pill mb-3 inline-flex">Lead inbox</p>
          <h1 className="text-3xl md:text-5xl tracking-tighter">Leads.</h1>
          <p className="text-ink-mute text-sm mt-2">
            Contact-form enquiries land here automatically from the website
            (source: Website). Add walk-ins and referrals by hand with Add
            lead, or move a lead forward with the row action. Role:{" "}
            <span className="font-mono text-xs">{role}</span>.
          </p>
        </div>
        <div className="md:col-span-4 flex md:justify-end">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="btn-primary"
          >
            Add lead
          </button>
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

      {/* Funnel stat cards: New / Qualified / Quote sent / Won. */}
      <section aria-label="Lead funnel" className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {STAT_CARDS.map((c) => (
          <div key={c.key} className="surface-tile rounded-[var(--radius-card)] p-4 md:p-5">
            <p className={LABEL_CLS}>{c.label}</p>
            <p className="font-display text-3xl md:text-4xl tracking-tight mt-2 text-ink">
              {stats[c.key] ?? 0}
            </p>
          </div>
        ))}
      </section>

      {/* Filters + search. */}
      <div className="surface-tile p-4 rounded-[var(--radius-card)]">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-4">
            <label className={LABEL_CLS} htmlFor="leads-search">
              Search by name or phone
            </label>
            <input
              id="leads-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  load();
                }
              }}
              placeholder="Name or phone..."
              className={INPUT_CLS + " mt-1"}
            />
          </div>
          <div className="md:col-span-3">
            <label className={LABEL_CLS} htmlFor="leads-status">
              Status
            </label>
            <select
              id="leads-status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setTimeout(load, 0);
              }}
              className={INPUT_CLS + " mt-1"}
            >
              <option value="">All statuses</option>
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {leadStatusLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <label className={LABEL_CLS} htmlFor="leads-source">
              Source
            </label>
            <select
              id="leads-source"
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                setTimeout(load, 0);
              }}
              className={INPUT_CLS + " mt-1"}
            >
              <option value="">All sources</option>
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {leadSourceLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 flex md:justify-end">
            <button
              type="button"
              onClick={load}
              disabled={busy}
              className="btn-ghost w-full md:w-auto"
            >
              {busy ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {/* Leads table. */}
      <div className="surface-tile rounded-[var(--radius-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-canvas">
              <tr>
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  name
                </th>
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  phone
                </th>
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  email
                </th>
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  source
                </th>
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  budget
                </th>
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  status
                </th>
                <th className="text-right px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  score
                </th>
                <th className="text-right px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  created
                </th>
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  move
                </th>
              </tr>
            </thead>
            <tbody className="divide-y hairline">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-ink-mute">
                    {busy
                      ? "Loading..."
                      : "No leads under the current filter."}
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.name}</p>
                    <Link
                      href={
                        row.clientProjectId
                          ? `/admin/client-projects/${row.clientProjectId}/proposal?lead_id=${row.id}`
                          : `/admin/client-projects/new?lead_id=${row.id}`
                      }
                      className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#c0964f] hover:underline"
                    >
                      {row.clientProjectId ? "Generate proposal" : "Create project"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{row.phone || "-"}</td>
                  <td className="px-4 py-3 font-mono text-xs break-all">
                    {row.email || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-[var(--radius-control)] border hairline-strong bg-canvas px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute">
                      {leadSourceLabel(row.source)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{row.budget || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <span className="inline-flex rounded-[var(--radius-control)] border border-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-accent-deep">
                        {leadStatusLabel(row.status)}
                      </span>
                      <span className="font-mono text-[10px] text-ink-mute" title="Last status change">
                        upd {fmtDate(row.lastStatusChangeAt)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {row.score ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs whitespace-nowrap">
                    {fmtDate(row.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value=""
                      aria-label={`Move ${row.name} to`}
                      onChange={(e) => {
                        if (e.target.value) moveTo(row.id, e.target.value);
                      }}
                      className="rounded-[var(--radius-control)] border hairline bg-canvas px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute focus:border-[var(--accent-deep)] focus:outline-none"
                    >
                      <option value="" disabled>
                        Move to...
                      </option>
                      {LEAD_STATUSES.filter((s) => s !== row.status).map((s) => (
                        <option key={s} value={s}>
                          {leadStatusLabel(s)}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <AddLeadModal
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            showToast("ok", "Lead added.");
            load();
          }}
          onError={(msg) => showToast("err", msg)}
        />
      )}
    </div>
  );
}

function AddLeadModal({
  onClose,
  onCreated,
  onError,
}: {
  onClose: () => void;
  onCreated: () => void;
  onError: (msg: string) => void;
}) {
  const [planError, setPlanError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    source: "manual",
    budget: "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      onError("Name is required.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/leads", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 402 && j?.code === "PLAN_LIMIT") {
          setPlanError(String(j.error ?? "Plan limit reached."));
          return;
        }
        onError(j.error || `Add failed (${r.status})`);
        return;
      }
      onCreated();
    } catch {
      onError("Network problem. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-[rgba(18,42,32,0.55)] p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Add lead"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="surface-elevated w-full max-w-md rounded-[var(--radius-card)] bg-canvas p-6">
        <p className="chrome-pill mb-2 inline-flex">New lead</p>
        <h2 className="text-2xl tracking-tighter mb-5">Add a lead.</h2>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4" noValidate>
          <label className="block">
            <span className={LABEL_CLS}>Name</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={INPUT_CLS + " mt-1"}
              autoComplete="name"
            />
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className={LABEL_CLS}>Phone</span>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={INPUT_CLS + " mt-1"}
                autoComplete="tel"
              />
            </label>
            <label className="block">
              <span className={LABEL_CLS}>Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={INPUT_CLS + " mt-1"}
                autoComplete="email"
              />
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className={LABEL_CLS}>Source</span>
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className={INPUT_CLS + " mt-1"}
              >
                {LEAD_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {leadSourceLabel(s)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={LABEL_CLS}>Budget</span>
              <input
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                placeholder="e.g. 15-20L"
                className={INPUT_CLS + " mt-1"}
              />
            </label>
          </div>
          <div className="flex items-center justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost text-xs h-10 px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary text-xs h-10 px-4"
            >
              {submitting ? "Adding..." : "Add lead"}
            </button>
          </div>
        </form>
      </div>
      <PlanLimitModal reason={planError} onClose={() => setPlanError(null)} />
    </div>
  );
}
