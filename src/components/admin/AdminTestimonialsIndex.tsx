"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Row = {
  id: number;
  name: string;
  role: string | null;
  quote: string;
  photo: string | null;
  is_published: boolean;
};

type Sort = "name" | "role";

export default function AdminTestimonialsIndex() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("name");
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/testimonials", { credentials: "include" });
      if (!r.ok) throw new Error(`list ${r.status}`);
      const data = await r.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message ?? "load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function publishToggle(r: Row) {
    setBusyId(r.id);
    try {
      const rr = await fetch(`/api/testimonials/${r.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isPublished: !r.is_published }),
      });
      if (rr.ok) await load();
      else {
        const j = await rr.json().catch(() => ({}));
        alert(j.error ?? "Toggle failed");
      }
    } finally {
      setBusyId(null);
    }
  }

  async function destroy(r: Row) {
    if (!confirm(`Delete testimonial from "${r.name}"? This removes the row only.`)) {
      return;
    }
    setBusyId(r.id);
    try {
      const rr = await fetch(`/api/testimonials/${r.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (rr.ok) await load();
      else {
        const j = await rr.json().catch(() => ({}));
        alert(j.error ?? "Delete failed");
      }
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let next = rows;
    if (needle) {
      next = next.filter((r) =>
        [r.name ?? "", r.role ?? "", r.quote ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(needle)
      );
    }
    const sortKey: Record<Sort, (r: Row) => string> = {
      name: (r) => (r.name ?? "").toLowerCase(),
      role: (r) => (r.role ?? "").toLowerCase(),
    };
    const sorted = [...next].sort((a, b) => {
      const A = sortKey[sort](a);
      const B = sortKey[sort](b);
      if (A < B) return -1;
      if (A > B) return 1;
      return a.id - b.id;
    });
    return sorted;
  }, [rows, q, sort]);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl tracking-tighter">Testimonials</h2>
          <p className="text-ink-mute text-sm mt-1">
            {rows.length} on record - {filtered.length} shown
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/admin/testimonials/new")}
            className="btn-primary"
          >
            New testimonial
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 surface-tile p-3">
        <label className="md:col-span-8 block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-1">
            Search
          </span>
          <input
            className="input-line"
            placeholder="name, role, quote"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <label className="md:col-span-4 block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-1">
            Sort
          </span>
          <select
            className="input-line bg-transparent"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
          >
            <option value="name">Name</option>
            <option value="role">Role</option>
          </select>
        </label>
      </div>

      {error && (
        <div className="surface-elevated px-4 py-3 text-sm text-ink rounded-[var(--radius-card)]">
          {error}
        </div>
      )}

      {loading ? (
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          Loading
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-ink-mute">
          No testimonials match. Create one using the button above.
        </p>
      ) : (
        <div className="divide-y hairline">
          {filtered.map((r) => {
            const busy = busyId === r.id;
            return (
              <article
                key={r.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 py-5 items-center"
              >
                <div className="md:col-span-6 min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
                    {`id=${r.id}`}
                  </p>
                  <h3 className="text-lg mt-1 truncate">{r.name}</h3>
                  <p className="text-xs text-ink-mute font-mono mt-1">
                    {r.role || "no role"}
                  </p>
                  <p className="text-sm text-ink-mute mt-2 line-clamp-2 italic">
                    "{r.quote}"
                  </p>
                </div>
                <div className="md:col-span-2">
                  <span
                    className={
                      "chrome-pill inline-flex " +
                      (r.is_published ? "" : "text-ink")
                    }
                    title={r.is_published ? "Published" : "Draft"}
                  >
                    {r.is_published ? "Published" : "Draft"}
                  </span>
                </div>
                <div className="md:col-span-4 flex md:justify-end gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => publishToggle(r)}
                    disabled={busy}
                    className="text-xs font-mono uppercase tracking-[0.18em] border-b hairline-strong pb-1 disabled:opacity-50"
                  >
                    {r.is_published ? "Unpublish" : "Publish"}
                  </button>
                  <Link
                    href={`/admin/testimonials/${r.id}`}
                    className="text-xs font-mono uppercase tracking-[0.18em] border-b hairline-strong pb-1"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => destroy(r)}
                    disabled={busy}
                    className="text-xs font-mono uppercase tracking-[0.18em] text-ink border-b border-[var(--accent-soft)] pb-1 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
