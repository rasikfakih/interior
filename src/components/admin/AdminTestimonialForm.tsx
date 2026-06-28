"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MediaPicker from "./MediaPicker";

export default function AdminTestimonialForm({
  initial,
  onSaved,
}: {
  initial?: any;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(() => ({
    name: initial?.name ?? "",
    role: initial?.role ?? "",
    quote: initial?.quote ?? "",
    photo: initial?.photo ?? "",
    isPublished: initial?.isPublished ?? true,
  }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.quote) {
      alert("Name and quote are required.");
      return;
    }
    setBusy(true);
    const url = initial?.id ? `/api/testimonials/${initial.id}` : "/api/testimonials";
    const method = initial?.id ? "PUT" : "POST";
    const r = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    });
    if (r.ok) {
      const body = await r.json().catch(() => ({}));
      const newId = body?.item?.id ?? initial?.id;
      setBusy(false);
      onSaved?.();
      if (!initial?.id && newId) {
        router.push(`/admin/testimonials/${newId}`);
      } else {
        router.refresh();
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
        {initial?.id ? "Edit testimonial" : "New testimonial"}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
            Name
          </span>
          <input
            className="input-line"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
            Role
          </span>
          <input
            className="input-line"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            placeholder="Homeowner"
          />
        </label>
      </div>

      <label className="block">
        <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
          Quote
        </span>
        <textarea
          className="input-line resize-y min-h-[160px] py-3"
          required
          value={form.quote}
          onChange={(e) => setForm({ ...form, quote: e.target.value })}
        />
      </label>

      <div>
        <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
          Photo
        </span>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-9">
            <input
              className="input-line"
              value={form.photo}
              placeholder="/uploads/images/..."
              onChange={(e) => setForm({ ...form, photo: e.target.value })}
            />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <MediaPicker
              label="Pick"
              accept="image"
              onPick={(_item, signedUrl) => {
                setForm({ ...form, photo: signedUrl ?? "" });
              }}
            />
          </div>
        </div>
        {form.photo && /^https?:\/\//.test(form.photo) && (
          <div className="mt-3 surface-tile overflow-hidden">
            <img
              src={form.photo}
              alt=""
              className="w-full h-44 object-cover"
              loading="lazy"
            />
          </div>
        )}
      </div>

      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="w-4 h-4"
          checked={form.isPublished}
          onChange={(e) =>
            setForm({ ...form, isPublished: e.target.checked })
          }
        />
        Published
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={busy}
          className="btn-primary disabled:opacity-50"
        >
          {busy
            ? "Saving"
            : initial?.id
              ? "Save testimonial"
              : "Create testimonial"}
        </button>
        {initial?.id && (
          <button
            type="button"
            onClick={() => router.push("/admin/testimonials")}
            className="btn-ghost"
          >
            Done
          </button>
        )}
      </div>
    </form>
  );
}
