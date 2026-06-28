"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MediaPicker from "./MediaPicker";

export default function AdminTeamForm({
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
    bio: initial?.bio ?? "",
    photo: initial?.photo ?? "",
    order: typeof initial?.order === "number" ? initial.order : 0,
    isPublished: initial?.isPublished ?? true,
  }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) {
      alert("Name is required.");
      return;
    }
    setBusy(true);
    const url = initial?.id ? `/api/team/${initial.id}` : "/api/team";
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
        router.push(`/admin/team/${newId}`);
      } else {
        router.refresh();
      }
      return;
    }
    setBusy(false);
    const j = await r.json().catch(() => ({}));
    alert(j.error || "Save failed");
  }

  async function move(delta: -1 | 1) {
    if (typeof initial?.id !== "number") {
      alert("Save once before reordering.");
      return;
    }
    const next = Math.max(0, (form.order || 0) + delta);
    setForm((prev) => ({ ...prev, order: next }));
    setBusy(true);
    const r = await fetch(`/api/team/${initial.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ order: next }),
    });
    setBusy(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(j.error || "Reorder failed");
    } else {
      router.refresh();
    }
  }

  return (
    <form
      onSubmit={save}
      className="surface-elevated p-6 md:p-8 rounded-[var(--radius-card)] space-y-5"
    >
      <p className="chrome-pill inline-flex">
        {initial?.id ? "Edit team member" : "New team member"}
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
            placeholder="Principal, Spatial design"
          />
        </label>
      </div>

      <label className="block">
        <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
          Bio
        </span>
        <textarea
          className="input-line resize-y min-h-[140px] py-3"
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
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

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        <label className="md:col-span-4 block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
            Order
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="input-line"
              value={form.order}
              onChange={(e) =>
                setForm({ ...form, order: Number(e.target.value) })
              }
            />
            <button
              type="button"
              onClick={() => move(-1)}
              className="text-xs font-mono uppercase tracking-[0.18em] border-b hairline-strong pb-1"
            >
              Up
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              className="text-xs font-mono uppercase tracking-[0.18em] border-b hairline-strong pb-1"
            >
              Down
            </button>
          </div>
        </label>
        <label className="md:col-span-8 flex items-center gap-3 text-sm pt-7">
          <input
            type="checkbox"
            className="w-4 h-4"
            checked={form.isPublished}
            onChange={(e) =>
              setForm({ ...form, isPublished: e.target.checked })
            }
          />
          Published on the public site
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={busy}
          className="btn-primary disabled:opacity-50"
        >
          {busy
            ? "Saving"
            : initial?.id
              ? "Save team member"
              : "Create team member"}
        </button>
        {initial?.id && (
          <button
            type="button"
            onClick={() => router.push("/admin/team")}
            className="btn-ghost"
          >
            Done
          </button>
        )}
      </div>
    </form>
  );
}
