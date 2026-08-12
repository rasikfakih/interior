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
      <form onSubmit={create} className="grid gap-4 border border-zinc-200 bg-white p-6">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500">
          New announcement
        </h2>
        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500 mb-2">
            Title
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-zinc-300 px-3 py-2 focus:border-zinc-700 focus:outline-none"
            required
          />
        </label>
        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500 mb-2">
            Body
          </span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="w-full border border-zinc-300 px-3 py-2 focus:border-zinc-700 focus:outline-none"
            required
          />
        </label>
        <div className="flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500 mb-2">
              Audience
            </span>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="border border-zinc-300 px-3 py-2 focus:border-zinc-700 focus:outline-none"
            >
              <option value="all">All (public bar)</option>
              <option value="public">Public only</option>
              <option value="admin">Admin console only</option>
            </select>
          </label>
          <label className="flex items-center gap-2 pb-2">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span className="text-sm text-zinc-700">Active now</span>
          </label>
          <button
            type="submit"
            disabled={busy}
            className="ml-auto bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {busy ? "Creating..." : "Create"}
          </button>
        </div>
        {err ? <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-red-700">{err}</p> : null}
        {msg ? <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-700">{msg}</p> : null}
      </form>

      <div className="border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
          All announcements
        </div>
        <ul className="divide-y divide-zinc-100">
          {items.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-zinc-500">
              No announcements yet.
            </li>
          ) : (
            items.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-zinc-900">{a.title}</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                      {a.audience}
                    </span>
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        Number(a.is_active) === 1 || a.is_active === true
                          ? "bg-emerald-500"
                          : "bg-zinc-300"
                      }`}
                    />
                  </div>
                  <p className="mt-1 text-sm text-zinc-600">{a.body}</p>
                  <p className="mt-1 font-mono text-[10px] text-zinc-400">
                    {new Date(a.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => toggle(a)}
                    className="border border-zinc-300 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600 hover:border-zinc-700"
                  >
                    {Number(a.is_active) === 1 || a.is_active === true ? "Pause" : "Activate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(a)}
                    className="border border-red-300 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-red-700 hover:border-red-700"
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
