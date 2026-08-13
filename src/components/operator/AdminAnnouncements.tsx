"use client";

import { useEffect, useState } from "react";

type Announcement = {
  id: number;
  title: string;
  body: string;
  audience: string;
  is_active: number | boolean;
  created_at: string;
};

export function AdminAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/operator/announcements", { credentials: "include" });
        if (!r.ok) throw new Error(`announcements ${r.status}`);
        const j = await r.json();
        if (cancelled) return;
        setItems(Array.isArray(j.items) ? j.items : []);
      } catch (e) {
        if (!cancelled) setErr((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function refresh() {
    try {
      const r = await fetch("/api/operator/announcements", { credentials: "include" });
      if (!r.ok) throw new Error(`announcements ${r.status}`);
      const j = await r.json();
      setItems(Array.isArray(j.items) ? j.items : []);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const r = await fetch("/api/operator/announcements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, body, audience, is_active: active }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error || "create failed");
        return;
      }
      setTitle("");
      setBody("");
      setMsg("announcement created");
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(a: Announcement) {
    await fetch(`/api/operator/announcements/${a.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ is_active: !(Number(a.is_active) === 1 || a.is_active === true) }),
    });
    await refresh();
  }

  async function remove(a: Announcement) {
    if (!confirm(`Delete announcement "${a.title}"?`)) return;
    await fetch(`/api/operator/announcements/${a.id}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <div className="grid gap-8">
      <form onSubmit={create} className="grid gap-4 op-panel p-6">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
          New announcement
        </h2>
        <label className="block">
          <span className="op-label">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-line"
            required
          />
        </label>
        <label className="block">
          <span className="op-label">Body</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="input-line"
            required
          />
        </label>
        <div className="flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="op-label">Audience</span>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="input-line"
            >
              <option value="all">All (public bar)</option>
              <option value="public">Public only</option>
              <option value="admin">Admin console only</option>
            </select>
          </label>
          <label className="flex items-center gap-2 pb-2">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span className="text-sm text-ink-mute">Active now</span>
          </label>
          <button
            type="submit"
            disabled={busy}
            className="btn-primary ml-auto h-10 px-5 text-[10px]"
          >
            {busy ? "Creating..." : "Create"}
          </button>
        </div>
        {err ? <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--op-bad)]">{err}</p> : null}
        {msg ? <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--op-good)]">{msg}</p> : null}
      </form>

      <div className="op-panel">
        <div className="op-panel-head">All announcements</div>
        <ul className="divide-y divide-[var(--line)]">
          {items.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-ink-mute">
              No announcements yet.
            </li>
          ) : (
            items.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-ink">{a.title}</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
                      {a.audience}
                    </span>
                    <span
                      className={`op-dot ${
                        Number(a.is_active) === 1 || a.is_active === true
                          ? "op-dot--good"
                          : "op-dot--off"
                      }`}
                    />
                  </div>
                  <p className="mt-1 text-sm text-ink-mute">{a.body}</p>
                  <p className="mt-1 font-mono text-[10px] text-ink-soft">
                    {new Date(a.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => toggle(a)}
                    className="op-btn-sm"
                  >
                    {Number(a.is_active) === 1 || a.is_active === true ? "Pause" : "Activate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(a)}
                    className="op-btn-sm op-btn-sm--danger"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
