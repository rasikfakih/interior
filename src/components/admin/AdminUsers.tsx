"use client";

import { useEffect, useState } from "react";

type UserRow = {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  tenant_id: number | null;
  created_at: string | null;
};

type Toast = { kind: "ok" | "err"; msg: string };

const ROLES = ["admin", "editor", "superadmin"] as const;

const INPUT_CLS =
  "w-full bg-canvas border hairline rounded-[var(--radius-control)] px-3 py-2 text-sm focus:border-[var(--accent-deep)] focus:outline-none";
const LABEL_CLS = "font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute";

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

export default function AdminUsers({ role }: { role: string }) {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newRole, setNewRole] = useState<string>("editor");

  function showToast(kind: Toast["kind"], msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2600);
  }

  async function load() {
    setBusy(true);
    try {
      const r = await fetch("/api/users", { credentials: "include" });
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
     
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function create() {
    setBusy(true);
    try {
      const r = await fetch("/api/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: newRole }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast("err", j.error || `Create failed (${r.status})`);
        return;
      }
      showToast("ok", `Created ${j.item?.email ?? email}.`);
      setEmail("");
      setPassword("");
      setNewRole("editor");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function patch(
    row: UserRow,
    patch: Partial<UserRow> & { password?: string }
  ) {
    const r = await fetch(`/api/users/${row.id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      showToast("err", j.error || `Update failed (${r.status})`);
      return false;
    }
    return true;
  }

  async function changeRole(row: UserRow, next: string) {
    if (next === row.role) return;
    const ok = await patch(row, { role: next });
    if (ok) {
      showToast("ok", `${row.email} is now ${next}.`);
      await load();
    }
  }

  async function toggleActive(row: UserRow) {
    const ok = await patch(row, { is_active: !row.is_active });
    if (ok) {
      showToast(
        "ok",
        `${row.is_active ? "Deactivated" : "Activated"} ${row.email}.`
      );
      await load();
    }
  }

  async function resetPassword(row: UserRow) {
    const next = typeof window !== "undefined" ? window.prompt(`New password for ${row.email} (min 8 chars):`) : null;
    if (!next) return;
    const ok = await patch(row, { password: next });
    if (ok) showToast("ok", `Password reset for ${row.email}.`);
  }

  async function del(row: UserRow) {
    if (typeof window !== "undefined") {
      const ok = window.confirm(`Delete user ${row.email}?`);
      if (!ok) return;
    }
    const r = await fetch(`/api/users/${row.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      showToast("err", j.error || `Delete failed (${r.status})`);
      return;
    }
    showToast("ok", `Deleted ${row.email}.`);
    await load();
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="chrome-pill mb-3 inline-flex">Users &amp; roles</p>
        <h1 className="text-3xl md:text-5xl tracking-tighter">Team access.</h1>
        <p className="text-ink-mute text-sm mt-2">
          <span className="font-mono text-xs">admin</span> manages everything,{" "}
          <span className="font-mono text-xs">editor</span> manages content
          only, <span className="font-mono text-xs">superadmin</span> is the
          platform operator. You cannot demote, deactivate, or delete your own
          account.
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
          <label className={LABEL_CLS}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={INPUT_CLS + " mt-1"}
            placeholder="designer@studio.com"
          />
        </div>
        <div className="md:col-span-3">
          <label className={LABEL_CLS}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT_CLS + " mt-1"}
            placeholder="min 8 characters"
          />
        </div>
        <div className="md:col-span-3">
          <label className={LABEL_CLS}>Role</label>
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className={INPUT_CLS + " mt-1"}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2 flex md:justify-end">
          <button
            type="button"
            onClick={create}
            disabled={busy}
            className="btn-primary text-xs h-10 px-3 disabled:opacity-50"
          >
            Add user
          </button>
        </div>
      </div>

      <div className="surface-tile rounded-[var(--radius-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-canvas">
              <tr>
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  email
                </th>
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  role
                </th>
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  status
                </th>
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  created
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
                    No users found.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-mono text-xs break-all">
                    {row.email}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={row.role}
                      onChange={(e) => changeRole(row, e.target.value)}
                      className={INPUT_CLS + " w-auto"}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-mono text-[10px] uppercase tracking-[0.22em] ${
                        row.is_active ? "text-accent-deep" : "text-ink-mute"
                      }`}
                    >
                      {row.is_active ? "active" : "inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {fmtDate(row.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => toggleActive(row)}
                      className="btn-ghost text-xs h-9 px-3"
                    >
                      {row.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => resetPassword(row)}
                      className="btn-ghost text-xs h-9 px-3"
                    >
                      Reset password
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
        Your role: <span className="font-mono text-xs">{role}</span>. Editors
        see this page as read-only; user management is admin+.
      </p>
    </div>
  );
}
