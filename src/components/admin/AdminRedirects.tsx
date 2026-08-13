"use client";

import { useEffect, useState } from "react";

type RedirectRow = {
  id: number;
  source: string;
  destination: string;
  status_code: number;
  is_active: boolean;
};

type Toast = { kind: "ok" | "err"; msg: string };

const INPUT_CLS =
  "w-full bg-canvas border hairline rounded-[var(--radius-control)] px-3 py-2 text-sm focus:border-[var(--accent-deep)] focus:outline-none";
const LABEL_CLS = "font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute";

const EMPTY: RedirectRow = {
  id: 0,
  source: "",
  destination: "",
  status_code: 301,
  is_active: true,
};

export default function AdminRedirects({ role }: { role: string }) {
  const [rows, setRows] = useState<RedirectRow[]>([]);
  const [draft, setDraft] = useState<RedirectRow>(EMPTY);
  const [editing, setEditing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  function showToast(kind: Toast["kind"], msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2600);
  }

  async function load() {
    setBusy(true);
    try {
      const r = await fetch("/api/redirects", { credentials: "include" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast("err", j.error || `Load failed (${r.status})`);
        return;
      }
      setRows(j ?? []);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setBusy(true);
    try {
      const isEdit = editing !== null;
      const r = isEdit
        ? await fetch(`/api/redirects/${editing}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(draft),
          })
        : await fetch("/api/redirects", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(draft),
          });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast("err", j.error || `Save failed (${r.status})`);
        return;
      }
      showToast("ok", isEdit ? "Redirect updated." : "Redirect created.");
      setDraft(EMPTY);
      setEditing(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function toggle(row: RedirectRow) {
    const r = await fetch(`/api/redirects/${row.id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...row, is_active: !row.is_active }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      showToast("err", j.error || `Update failed (${r.status})`);
      return;
    }
    await load();
  }

  async function del(row: RedirectRow) {
    if (typeof window !== "undefined") {
      const ok = window.confirm(`Delete redirect "${row.source}"?`);
      if (!ok) return;
    }
    const r = await fetch(`/api/redirects/${row.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      showToast("err", j.error || `Delete failed (${r.status})`);
      return;
    }
    if (editing === row.id) {
      setEditing(null);
      setDraft(EMPTY);
    }
    await load();
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="chrome-pill mb-3 inline-flex">Redirects</p>
        <h1 className="text-3xl md:text-5xl tracking-tighter">Move old paths.</h1>
        <p className="text-ink-mute text-sm mt-2">
          DB-driven 301/302 rules applied to unmatched public paths. Sources
          are normalized to <span className="font-mono text-xs">/path</span>{" "}
          with no trailing slash. The site root cannot be redirected.
        </p>
      </header>

      {toast && (
        <div
          role="status"
          className={`surface-elevated px-4 py-3 text-sm rounded-[var(--radius-card)] ${
            toast.kind === "err" ? "text-red-700" : "text-accent-deep"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="surface-tile p-5 rounded-[var(--radius-card)] grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div className="md:col-span-4">
          <label className={LABEL_CLS}>From</label>
          <input
            value={draft.source}
            onChange={(e) => setDraft({ ...draft, source: e.target.value })}
            className={INPUT_CLS + " mt-1"}
            placeholder="/old-page"
          />
        </div>
        <div className="md:col-span-4">
          <label className={LABEL_CLS}>To</label>
          <input
            value={draft.destination}
            onChange={(e) => setDraft({ ...draft, destination: e.target.value })}
            className={INPUT_CLS + " mt-1"}
            placeholder="/about or https://example.com/x"
          />
        </div>
        <div className="md:col-span-2">
          <label className={LABEL_CLS}>Status</label>
          <select
            value={draft.status_code}
            onChange={(e) =>
              setDraft({ ...draft, status_code: Number(e.target.value) })
            }
            className={INPUT_CLS + " mt-1"}
          >
            <option value={301}>301 Permanent</option>
            <option value={302}>302 Temporary</option>
          </select>
        </div>
        <div className="md:col-span-2 flex md:justify-end gap-2">
          {editing !== null && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setDraft(EMPTY);
              }}
              className="btn-ghost text-xs h-10 px-3"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="btn-primary text-xs h-10 px-3 disabled:opacity-50"
          >
            {busy ? "Saving..." : editing !== null ? "Update" : "Add redirect"}
          </button>
        </div>
      </div>

      <div className="surface-tile rounded-[var(--radius-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-canvas">
              <tr>
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  from
                </th>
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  to
                </th>
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  status
                </th>
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  state
                </th>
                <th className="text-right px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y hairline">
              {rows.length === 0 && !busy && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ink-mute">
                    No redirects yet. Add one above.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-mono text-xs break-all">
                    {row.source}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs break-all">
                    {row.destination}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{row.status_code}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-mono text-[10px] uppercase tracking-[0.22em] ${
                        row.is_active ? "text-accent-deep" : "text-ink-mute"
                      }`}
                    >
                      {row.is_active ? "active" : "paused"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(row.id);
                        setDraft({ ...row });
                      }}
                      className="btn-ghost text-xs h-9 px-3"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(row)}
                      className="btn-ghost text-xs h-9 px-3"
                    >
                      {row.is_active ? "Pause" : "Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => del(row)}
                      className="btn-ghost text-xs h-9 px-3"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-ink-mute">
        Role: <span className="font-mono text-xs">{role}</span>. Redirects
        apply immediately - no rebuild needed.
      </p>
    </div>
  );
}
