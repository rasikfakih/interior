"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RichTextEditor from "./RichTextEditor";
import ProjectRoomsManager from "./ProjectRoomsManager";

const FLABEL =
  "block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2";

type FormState = {
  title: string;
  slug: string;
  category: string;
  location: string;
  year: string;
  scope: string;
  description: string;
  descriptionJson: string | null;
  beforeImage: string;
  afterImage: string;
  posterMediaId: number | null;
  galleryMediaIds: number[];
  model3d: string;
  isPublished: boolean;
};

export type ProjectFormInitial = {
  id?: number;
  title?: string;
  slug?: string;
  category?: string;
  location?: string | null;
  year?: string | null;
  scope?: string | null;
  description?: string;
  description_json?: string | null;
  descriptionJson?: string | null;
  before_image?: string | null;
  beforeImage?: string | null;
  after_image?: string | null;
  afterImage?: string | null;
  poster_media_id?: number | null;
  posterMediaId?: number | null;
  gallery_media_ids?: number[] | string | null;
  galleryMediaIds?: number[] | string | null;
  model_3d?: string | null;
  model3d?: string | null;
  is_published?: boolean;
  isPublished?: boolean;
};

export default function AdminProjectForm({
  initial,
  onSaved,
}: {
  initial?: ProjectFormInitial;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<FormState>(() => {
    const r = initial ?? {};
    return {
      title: r.title ?? "",
      slug: r.slug ?? "",
      category: r.category ?? "Apartment",
      location: r.location ?? "",
      year: r.year ?? "",
      scope: r.scope ?? "",
      description: r.description ?? "",
      descriptionJson: r.description_json ?? r.descriptionJson ?? null,
      beforeImage: r.before_image ?? r.beforeImage ?? "",
      afterImage: r.after_image ?? r.afterImage ?? "",
      posterMediaId: r.poster_media_id ?? r.posterMediaId ?? null,
      galleryMediaIds: Array.isArray(r.gallery_media_ids)
        ? r.gallery_media_ids
        : Array.isArray(r.galleryMediaIds)
        ? r.galleryMediaIds
        : [],
      model3d: r.model_3d ?? r.model3d ?? "",
      isPublished:
        typeof r.is_published === "boolean"
          ? r.is_published
          : typeof r.isPublished === "boolean"
          ? r.isPublished
          : true,
    };
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const url = initial?.id ? `/api/projects/${initial.id}` : "/api/projects";
    const method = initial?.id ? "PUT" : "POST";
    const r = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (r.ok) {
      router.refresh();
      onSaved?.();
    } else {
      const j = await r.json().catch(() => ({}));
      alert(j.error || "Save failed");
    }
  }

  return (
    <form onSubmit={save} className="surface-tile p-6 md:p-8 rounded-[var(--radius-card)] space-y-6">
      <p className="chrome-pill inline-flex">
        {initial?.id ? "Edit project" : "New project"}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <label className="block">
          <span className={FLABEL}>Title</span>
          <input
            className="input-line"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>
        <label className="block">
          <span className={FLABEL}>Slug (auto if blank)</span>
          <input
            className="input-line"
            value={form.slug}
            onChange={(e) =>
              setForm({
                ...form,
                slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
              })
            }
          />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <label className="block">
          <span className={FLABEL}>Category</span>
          <select
            className="input-line bg-transparent"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option>Apartment</option>
            <option>Villa</option>
            <option>Coastal</option>
            <option>Commercial</option>
            <option>Residential</option>
          </select>
        </label>
        <label className="block">
          <span className={FLABEL}>Location</span>
          <input
            className="input-line"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </label>
        <label className="block">
          <span className={FLABEL}>Year</span>
          <input
            className="input-line"
            value={form.year}
            onChange={(e) => setForm({ ...form, year: e.target.value })}
          />
        </label>
      </div>

      <label className="block">
        <span className={FLABEL}>Scope (1 line)</span>
        <input
          className="input-line"
          value={form.scope}
          onChange={(e) => setForm({ ...form, scope: e.target.value })}
        />
      </label>

      <div>
        <p className={FLABEL}>Long description (rich text)</p>
        <RichTextEditor
          value={form.descriptionJson}
          onChange={(j) => setForm({ ...form, descriptionJson: j })}
          placeholder="Tell the story of this project…"
        />
        <label className="block mt-3">
          <span className={FLABEL}>Plain fallback (used if rich text empty)</span>
          <textarea
            rows={3}
            className="input-line resize-none"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
      </div>

      <label className="block">
        <span className={FLABEL}>Cover image URL (or pick from Media)</span>
        <input
          className="input-line"
          value={form.beforeImage}
          onChange={(e) => setForm({ ...form, beforeImage: e.target.value })}
          placeholder="/uploads/images/…"
        />
      </label>

      <label className="block">
        <span className={FLABEL}>3D model URL (.glb) - fallback for the walkthrough + rooms</span>
        <input
          className="input-line"
          value={form.model3d}
          onChange={(e) => setForm({ ...form, model3d: e.target.value })}
          placeholder="/uploads/models/seed/reception-room.glb"
        />
      </label>

      {initial?.id ? (
        <section className="border-t hairline pt-6">
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
            Per-space walkthrough
          </h2>
          <ProjectRoomsManager projectId={initial.id} />
        </section>
      ) : (
        <p className="text-xs text-ink-mute">
          Rooms (per-space 3D walkthrough) become available after the project
          is created.
        </p>
      )}

      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="w-4 h-4"
          checked={form.isPublished}
          onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
        />
        Published on the public site
      </label>

      <div className="sticky bottom-0 -mx-6 md:mx-0 px-6 md:px-0 pt-3 pb-3 md:pb-0 mt-2 flex gap-3 bg-canvas/95 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none border-t hairline md:border-0">
        <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">
          {busy ? "Saving" : initial?.id ? "Save changes" : "Create project"}
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
