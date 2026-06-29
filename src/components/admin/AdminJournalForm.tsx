"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import RichTextEditor from "./RichTextEditor";
import MediaPicker from "./MediaPicker";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export default function AdminJournalForm({
  initial,
  onSaved,
}: {
  initial?: any;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(() => ({
    title: initial?.title ?? "",
    slug: initial?.slug ?? "",
    excerpt: initial?.excerpt ?? "",
    category: initial?.category ?? "Materials",
    authorName: initial?.authorName ?? "Studio",
    coverImage: initial?.coverImage ?? "",
    content: initial?.content ?? "",
    contentJson: initial?.contentJson ?? null,
    isPublished: initial?.isPublished ?? true,
  }));

  const slugFromTitle = useMemo(() => slugify(form.title || ""), [form.title]);
  const dirtyTitleSlug =
    !form.slug || form.slug === slugify(initial?.title || "");
  const showSuggestion =
    Boolean(slugFromTitle) &&
    (!form.slug || (dirtyTitleSlug && form.slug !== slugFromTitle));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload = {
      ...form,
      slug: form.slug?.trim() ? form.slug : slugFromTitle || undefined,
    };
    const url = initial?.id ? `/api/journal/${initial.id}` : "/api/journal";
    const method = initial?.id ? "PUT" : "POST";
    const r = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (r.ok) {
      const body = await r.json().catch(() => ({}));
      const newId = body?.item?.id ?? initial?.id;
      setBusy(false);
      router.refresh();
      onSaved?.();
      if (!initial?.id && newId) {
        router.push(`/admin/journal/${newId}`);
      }
      return;
    }
    setBusy(false);
    const j = await r.json().catch(() => ({}));
    alert(j.error || "Save failed");
  }

  return (
    <form
      onSubmit={save}
      className="surface-elevated p-6 md:p-8 rounded-[var(--radius-card)] space-y-5"
    >
      <p className="chrome-pill inline-flex">
        {initial?.id ? "Edit entry" : "New entry"}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
            Title
          </span>
          <input
            className="input-line"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
            Slug
          </span>
          <input
            className="input-line"
            value={form.slug}
            onChange={(e) =>
              setForm({ ...form, slug: slugify(e.target.value) })
            }
          />
          {showSuggestion && (
            <button
              type="button"
              className="mt-2 text-xs font-mono uppercase tracking-[0.18em] text-warm border-b border-[var(--accent-warm-soft)] pb-1"
              onClick={() =>
                setForm({ ...form, slug: slugFromTitle })
              }
            >
              Use "{slugFromTitle}"
            </button>
          )}
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
            Category
          </span>
          <input
            className="input-line"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
            Author
          </span>
          <input
            className="input-line"
            value={form.authorName}
            onChange={(e) => setForm({ ...form, authorName: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
            Cover image URL
          </span>
          <div className="flex items-center gap-2">
            <input
              className="input-line flex-1"
              value={form.coverImage}
              onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
            />
            <MediaPicker
              label="Pick"
              accept="image"
              onPick={(_item, signedUrl) =>
                setForm({ ...form, coverImage: signedUrl ?? "" })
              }
            />
          </div>
        </label>
      </div>

      <label className="block">
        <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
          Excerpt (list page)
        </span>
        <input
          className="input-line"
          value={form.excerpt}
          onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
        />
      </label>

      <div>
        <p className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
          Body (rich text)
        </p>
        <RichTextEditor
          value={form.contentJson}
          onChange={(j) => setForm({ ...form, contentJson: j })}
          placeholder="Tell the field story…"
        />
        <label className="block mt-3">
          <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
            Plain fallback
          </span>
          <textarea
            rows={3}
            className="input-line resize-none"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
          />
        </label>
      </div>

      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="w-4 h-4"
          checked={form.isPublished}
          onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
        />
        Published
      </label>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">
          {busy ? "Saving" : initial?.id ? "Save entry" : "Create entry"}
        </button>
        {initial?.id && (
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="btn-ghost"
          >
            Done
          </button>
        )}
      </div>
    </form>
  );
}
