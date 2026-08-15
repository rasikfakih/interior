"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MATERIAL_CATEGORIES,
  materialCategoryLabel,
  type VendorDto,
} from "@/lib/materials";
import { IconPlus, IconStar } from "@/components/icons";

type Toast = { kind: "ok" | "err"; msg: string };

const INPUT_CLS =
  "w-full bg-canvas border hairline rounded-[var(--radius-control)] px-3 py-2 text-sm focus:border-[var(--accent-deep)] focus:outline-none";

const LABEL_CLS =
  "block font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a] mb-2";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <IconStar
          key={i}
          size={12}
          weight={i < rating ? "fill" : "regular"}
          className={i < rating ? "text-[#c0964f]" : "text-[#56605a]"}
          aria-hidden
        />
      ))}
    </span>
  );
}

export default function AdminVendors({ role }: { role: string }) {
  const [vendors, setVendors] = useState<VendorDto[]>([]);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [modal, setModal] = useState<{ vendor: VendorDto | null } | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  function showToast(kind: Toast["kind"], msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2400);
  }

  async function load() {
    setBusy(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (q.trim()) params.set("search", q.trim());
      const r = await fetch(`/api/vendors?${params}`, { credentials: "include" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast("err", j.error || `Load failed (${r.status})`);
        return;
      }
      setVendors(j.vendors ?? []);
    } finally {
      setBusy(false);
    }
  }

  // Debounced load covers mount + every filter change in one path.
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category]);

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-end">
        <div className="md:col-span-9">
          <p className="chrome-pill mb-3 inline-flex">Vendor library</p>
          <h1 className="text-3xl md:text-5xl tracking-tighter">Vendors.</h1>
          <p className="text-ink-mute text-sm mt-2">
            The suppliers behind every material. Lead times and ratings
            keep the library honest when the BOQ lands. Role:{" "}
            <span className="font-mono text-xs">{role}</span>.
          </p>
        </div>
        <div className="md:col-span-3 flex md:justify-end">
          <button type="button" onClick={() => setModal({ vendor: null })} className="btn-primary">
            <IconPlus size={14} aria-hidden /> Add vendor
          </button>
        </div>
      </header>

      {toast && (
        <div role="status" className="surface-elevated px-4 py-3 text-sm rounded-[var(--radius-card)] text-accent-deep">
          {toast.msg}
        </div>
      )}

      <div className="surface-tile p-4 rounded-[var(--radius-card)]">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-6">
            <label className={LABEL_CLS}>Search name or phone</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Marble supplier, +91..."
              className={INPUT_CLS}
            />
          </div>
          <div className="md:col-span-3">
            <label className={LABEL_CLS}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={INPUT_CLS}>
              <option value="">All categories</option>
              {MATERIAL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {materialCategoryLabel(c)}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3 text-right">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#56605a]">
              {vendors.length} vendor{vendors.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>

      <div className="surface-tile overflow-x-auto rounded-[var(--radius-card)]">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b hairline">
            <tr>
              {["name", "category", "phone", "lead time", "rating", "materials", ""].map(
                (h, i) => (
                  <th key={i} className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y hairline">
            {vendors.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-mute">
                  {busy ? "Loading..." : "No vendors yet. Add your first supplier."}
                </td>
              </tr>
            )}
            {vendors.map((v) => (
              <tr key={v.id}>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setModal({ vendor: v })}
                    className="font-medium hover:underline text-left"
                  >
                    {v.name}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-[var(--radius-control)] border hairline-strong bg-canvas px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[#56605a]">
                    {materialCategoryLabel(v.category)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {v.phone ? (
                    <a href={`tel:${v.phone.replace(/\s+/g, "")}`} className="font-mono text-xs text-[#56605a] hover:text-ink">
                      {v.phone}
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {v.leadTimeDays > 0 ? `${v.leadTimeDays} days` : "-"}
                </td>
                <td className="px-4 py-3">
                  <Stars rating={v.rating} />
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/materials?vendor_id=${v.id}`}
                    className="font-mono text-xs text-accent-deep hover:underline"
                  >
                    {v.materialsCount ?? 0} material{(v.materialsCount ?? 0) === 1 ? "" : "s"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => setModal({ vendor: v })}
                    className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent-deep hover:underline"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <VendorModal
          vendor={modal.vendor}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            showToast("ok", "Vendor saved.");
            load();
          }}
          onDeleted={() => {
            setModal(null);
            showToast("ok", "Vendor deleted. Linked materials detached.");
            load();
          }}
          onError={(msg) => showToast("err", msg)}
        />
      )}
    </div>
  );
}

function VendorModal({
  vendor,
  onClose,
  onSaved,
  onDeleted,
  onError,
}: {
  vendor: VendorDto | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    name: vendor?.name ?? "",
    category: vendor?.category ?? "stone",
    phone: vendor?.phone ?? "",
    email: vendor?.email ?? "",
    address: vendor?.address ?? "",
    leadTimeDays: vendor ? String(vendor.leadTimeDays) : "7",
    rating: vendor ? String(vendor.rating) : "0",
    notes: vendor?.notes ?? "",
  });
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      onError("A vendor name is required.");
      return;
    }
    setBusy(true);
    try {
      const body = {
        ...form,
        lead_time_days: Number(form.leadTimeDays) || 0,
        rating: Number(form.rating) || 0,
      };
      const r = vendor
        ? await fetch(`/api/vendors/${vendor.id}`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/vendors", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        onError(j.error || `Save failed (${r.status})`);
        return;
      }
      onSaved();
    } catch {
      onError("Network problem. Save not completed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!vendor) return;
    if (!window.confirm(`Delete ${vendor.name}? Linked materials will keep their cost but lose the vendor link.`)) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/vendors/${vendor.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        onError(j.error || "Delete failed");
        return;
      }
      onDeleted();
    } catch {
      onError("Network problem. Delete not completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto py-8"
      style={{ background: "rgba(18, 42, 32, 0.6)" }}
      role="dialog"
      aria-modal="true"
      aria-label={vendor ? `Edit ${vendor.name}` : "Add vendor"}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={save}
        className="w-full max-w-lg rounded-lg border hairline bg-canvas p-6 space-y-5"
      >
        <p className="chrome-pill inline-flex">{vendor ? "Edit vendor" : "Add vendor"}</p>
        <div>
          <label className={LABEL_CLS}>Name</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={INPUT_CLS} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={LABEL_CLS}>Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={INPUT_CLS}>
              {MATERIAL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {materialCategoryLabel(c)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={INPUT_CLS + " font-mono"} />
          </div>
          <div>
            <label className={LABEL_CLS}>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={INPUT_CLS + " font-mono"} />
          </div>
          <div>
            <label className={LABEL_CLS}>Address</label>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Lead time (days)</label>
            <input type="number" min={0} value={form.leadTimeDays} onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })} className={INPUT_CLS + " font-mono"} />
          </div>
          <div>
            <label className={LABEL_CLS}>Rating (0-5)</label>
            <input type="number" min={0} max={5} value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} className={INPUT_CLS + " font-mono"} />
          </div>
        </div>
        <div>
          <label className={LABEL_CLS}>Notes</label>
          <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={INPUT_CLS + " resize-none"} />
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">
            Cancel
          </button>
          {vendor && (
            <button type="button" onClick={remove} disabled={busy} className="btn-ghost text-[var(--accent-deep)]">
              Delete
            </button>
          )}
          <button type="submit" disabled={busy} className="btn-primary flex-1">
            {busy ? "Saving..." : "Save vendor"}
          </button>
        </div>
      </form>
    </div>
  );
}
