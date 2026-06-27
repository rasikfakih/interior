"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type PageRow = {
  id: number;
  slug: string;
  title: string;
  status: string;
  is_front: number;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
};

export default function PagesAdmin() {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPage, setNewPage] = useState({ slug: "", title: "" });
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/pages", { credentials: "include" });
      if (r.ok) setPages(await r.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!newPage.slug || !newPage.title) return;
    setBusy(true);
    const r = await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ...newPage, status: "draft" }),
    });
    setBusy(false);
    if (r.ok) {
      setNewPage({ slug: "", title: "" });
      load();
    } else {
      const j = await r.json().catch(() => ({}));
      alert(j.error ?? "Failed to create page");
    }
  }

  async function destroy(id: number) {
    if (!confirm("Delete this page and all its blocks?")) return;
    const r = await fetch(`/api/pages/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (r.ok) load();
    else alert("Delete failed");
  }

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl tracking-tighter">Pages</h2>
          <p className="text-ink-mute text-sm mt-1">
            {pages.length} on record · drag-reorder block builder per page
          </p>
        </div>
      </div>

      <form
        onSubmit={create}
        className="surface-elevated p-6 md:p-7 rounded-[var(--radius-card)] space-y-4"
      >
        <p className="chrome-pill inline-flex">New page</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
              Slug
            </span>
            <input
              className="input-line"
              placeholder="about"
              value={newPage.slug}
              onChange={(e) =>
                setNewPage({
                  ...newPage,
                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                })
              }
            />
          </label>
          <label className="block">
            <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
              Title
            </span>
            <input
              className="input-line"
              placeholder="About the studio"
              value={newPage.title}
              onChange={(e) =>
                setNewPage({ ...newPage, title: e.target.value })
              }
            />
          </label>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">
            {busy ? "Creating" : "Create page"}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          Loading…
        </p>
      ) : pages.length === 0 ? (
        <p className="text-ink-mute">No pages yet.</p>
      ) : (
        <div className="divide-y hairline">
          {pages.map((p) => (
            <article
              key={p.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-3 py-5 items-center"
            >
              <div className="md:col-span-7">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
                  /{p.slug}
                  {p.is_front ? " · front" : ""}
                </p>
                <h3 className="text-lg mt-1">{p.title}</h3>
                {p.published_at && (
                  <p className="text-xs text-ink-mute font-mono mt-1">
                    Published {new Date(p.published_at).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="md:col-span-3">
                <span className="chrome-pill inline-flex">{p.status}</span>
              </div>
              <div className="md:col-span-2 flex md:justify-end gap-3">
                <Link
                  href={`/admin/pages/${p.id}`}
                  className="text-xs font-mono uppercase tracking-[0.18em] border-b hairline-strong pb-1"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => destroy(p.id)}
                  className="text-xs font-mono uppercase tracking-[0.18em] text-warm border-b border-[var(--accent-warm-soft)] pb-1"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
