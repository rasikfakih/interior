"use client";

import { useEffect, useMemo, useState } from "react";

type Subscriber = {
  id: number;
  email: string;
  subscribedAt: string | null;
  active: boolean;
};

type Toast = { kind: "ok" | "err"; msg: string };

const INPUT_CLS =
  "w-full bg-canvas border hairline rounded-[var(--radius-control)] px-3 py-2 text-sm focus:border-accent focus:outline-none";

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

export default function AdminNewsletterList({ role }: { role: string }) {
  const [rows, setRows] = useState<Subscriber[]>([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  function showToast(kind: Toast["kind"], msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2400);
  }

  async function load() {
    setBusy(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (showInactive) params.set("all", "1");
      params.set("limit", "500");
      const r = await fetch(`/api/newsletter-subscribers?${params.toString()}`, {
        credentials: "include",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast("err", j.error || `Load failed (${r.status})`);
        return;
      }
      setRows(j.subscribers ?? []);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo<Subscriber[]>(() => {
    if (!showInactive) {
      return rows.filter((r) => r.active);
    }
    return rows;
  }, [rows, showInactive]);

  async function deactivate(id: number, email: string) {
    if (typeof window !== "undefined") {
      const ok = window.confirm(
        `Deactivate subscriber ${email}? They can be reactivated with the Reactivate button.`
      );
      if (!ok) return;
    }
    const r = await fetch(`/api/newsletter-subscribers/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      showToast("err", j.error || `Deactivate failed (${r.status})`);
      return;
    }
    showToast("ok", `Deactivated ${email}`);
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, active: false } : r
      )
    );
  }

  async function reactivate(id: number, email: string) {
    const r = await fetch(`/api/newsletter-subscribers/${id}`, {
      method: "PATCH",
      credentials: "include",
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      showToast("err", j.error || `Reactivate failed (${r.status})`);
      return;
    }
    showToast("ok", `Reactivated ${email}`);
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: true } : r))
    );
  }

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-end">
        <div className="md:col-span-8">
          <p className="chrome-pill mb-3 inline-flex">Newsletter</p>
          <h1 className="text-3xl md:text-5xl tracking-tighter">Subscribers.</h1>
          <p className="text-ink-mute text-sm mt-2">
            Read-only view of the public subscribe form&apos;s history.
            Soft-delete with the Deactivate button (the row stays so
            the audit log can trace who unsubscribed whom).
            Reactivate restores the row without changing email or
            subscribed_at. Role:{" "}
            <span className="font-mono text-xs">{role}</span>.
          </p>
        </div>
        <div className="md:col-span-4 flex md:justify-end">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            {filtered.length} of {rows.length} visible
          </span>
        </div>
      </header>

      {toast && (
        <div
          role="status"
          className={`surface-elevated px-4 py-3 text-sm rounded-[var(--radius-card)] ${
            toast.kind === "err" ? "text-red-700" : "text-accent"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="surface-tile p-4 rounded-[var(--radius-card)]">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-7">
            <label className={LABEL_CLS}>Search by email substring</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  load();
                }
              }}
              placeholder="studio@example.com"
              className={INPUT_CLS + " mt-1"}
            />
          </div>
          <div className="md:col-span-3 flex items-center gap-2">
            <input
              id="showInactive"
              type="checkbox"
              checked={showInactive}
              onChange={(e) => {
                setShowInactive(e.target.checked);
                setTimeout(load, 0);
              }}
            />
            <label htmlFor="showInactive" className="text-sm">
              Show inactive
            </label>
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

      <div className="surface-tile rounded-[var(--radius-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-canvas">
              <tr>
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  id
                </th>
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  email
                </th>
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  subscribed
                </th>
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  status
                </th>
                <th className="text-right px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y hairline">
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-ink-mute"
                  >
                    {busy
                      ? "Loading..."
                      : "No subscribers under the current filter."}
                  </td>
                </tr>
              )}
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-mono text-xs">{row.id}</td>
                  <td className="px-4 py-3 font-mono text-xs break-all">
                    {row.email}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {fmtDate(row.subscribedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-mono text-[10px] uppercase tracking-[0.22em] ${
                        row.active ? "text-accent" : "text-ink-mute"
                      }`}
                    >
                      {row.active ? "active" : "inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    {row.active ? (
                      <button
                        type="button"
                        onClick={() => deactivate(row.id, row.email)}
                        className="btn-ghost text-xs h-9 px-3"
                        disabled={busy}
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => reactivate(row.id, row.email)}
                        className="btn-primary text-xs h-9 px-3"
                        disabled={busy}
                      >
                        Reactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-ink-mute">
        Soft-delete preserves the public form&apos;s append-only history; the
        subscriber receives no notification. Hard-delete is intentionally
        not exposed.
      </p>
    </div>
  );
}
