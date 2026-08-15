"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  MATERIAL_CATEGORIES,
  MATERIAL_UNITS,
  STOCK_STATUSES,
  formatCost,
  materialCategoryLabel,
  materialUnitLabel,
  stockStatusLabel,
  type MaterialDto,
  type VendorDto,
} from "@/lib/materials";
import { IconPlus } from "@/components/icons";
import { IMAGES, materialImageUrl } from "@/lib/images";

type Toast = { kind: "ok" | "err"; msg: string };

const INPUT_CLS =
  "w-full bg-canvas border hairline rounded-[var(--radius-control)] px-3 py-2 text-sm focus:border-[var(--accent-deep)] focus:outline-none";

const LABEL_CLS =
  "block font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a] mb-2";

// Semantic stock dots stay inside the Forest & Bone ramp: moss for
// healthy stock, amber for low, ink for empty, clay for retired.
const STOCK_DOT: Record<string, string> = {
  in_stock: "#56605a",
  low: "#c0964f",
  out_of_stock: "#122a20",
  discontinued: "#d6cbb3",
};

const STAT_CARDS: { key: "total" | "categories" | "vendors" | "out"; label: string }[] = [
  { key: "total", label: "Total materials" },
  { key: "categories", label: "Categories" },
  { key: "vendors", label: "Vendors linked" },
  { key: "out", label: "Out of stock" },
];

export default function AdminMaterials({
  role,
  initialVendorId,
}: {
  role: string;
  initialVendorId?: string;
}) {
  const [materials, setMaterials] = useState<MaterialDto[]>([]);
  const [vendors, setVendors] = useState<VendorDto[]>([]);
  const [stats, setStats] = useState({ total: 0, categories: 0, vendors: 0, out: 0 });
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [vendorId, setVendorId] = useState(initialVendorId ?? "");
  const [stockStatus, setStockStatus] = useState("");
  const [modal, setModal] = useState<{ material: MaterialDto | null } | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  function showToast(kind: Toast["kind"], msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2400);
  }

  async function loadVendors() {
    const r = await fetch("/api/vendors", { credentials: "include" });
    const j = await r.json().catch(() => ({}));
    if (r.ok) setVendors(j.vendors ?? []);
  }

  async function load() {
    setBusy(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (vendorId) params.set("vendor_id", vendorId);
      if (stockStatus) params.set("stock_status", stockStatus);
      if (q.trim()) params.set("search", q.trim());
      const r = await fetch(`/api/materials?${params}`, { credentials: "include" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast("err", j.error || `Load failed (${r.status})`);
        return;
      }
      setMaterials(j.materials ?? []);
    } finally {
      setBusy(false);
    }
  }

  // Library-wide stats (unfiltered) so the cards stay meaningful under
  // any filter, plus the vendor list for selects.
  async function loadStats() {
    const r = await fetch("/api/materials", { credentials: "include" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return;
    const all: MaterialDto[] = j.materials ?? [];
    const categories = new Set(all.map((m) => m.category));
    const vendors = new Set(all.map((m) => m.vendorId).filter(Boolean));
    setStats({
      total: all.length,
      categories: categories.size,
      vendors: vendors.size,
      out: all.filter((m) => m.stockStatus === "out_of_stock").length,
    });
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStats();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadVendors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category, vendorId, stockStatus]);

  function refresh() {
    load();
    loadStats();
    loadVendors();
  }

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-end">
        <div className="md:col-span-9">
          <p className="chrome-pill mb-3 inline-flex">Material library</p>
          <h1 className="text-3xl md:text-5xl tracking-tighter">Materials.</h1>
          <p className="text-ink-mute text-sm mt-2">
            Every stone, wood and fitting the studio specifies - one
            source instead of sheets. Role:{" "}
            <span className="font-mono text-xs">{role}</span>.
          </p>
        </div>
        <div className="md:col-span-3 flex md:justify-end">
          <button type="button" onClick={() => setModal({ material: null })} className="btn-primary">
            <IconPlus size={14} aria-hidden /> Add material
          </button>
        </div>
      </header>

      {toast && (
        <div role="status" className="surface-elevated px-4 py-3 text-sm rounded-[var(--radius-card)] text-accent-deep">
          {toast.msg}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STAT_CARDS.map((c) => (
          <div key={c.key} className="surface-tile rounded-lg p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#56605a]">{c.label}</p>
            <p className="font-display text-3xl tracking-tighter mt-2">{stats[c.key]}</p>
          </div>
        ))}
      </div>

      <div className="surface-tile p-4 rounded-[var(--radius-card)]">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-4">
            <label className={LABEL_CLS}>Search name or sku</label>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Italian marble, SKU..." className={INPUT_CLS} />
          </div>
          <div className="md:col-span-2">
            <label className={LABEL_CLS}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={INPUT_CLS}>
              <option value="">All</option>
              {MATERIAL_CATEGORIES.map((c) => (
                <option key={c} value={c}>{materialCategoryLabel(c)}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={LABEL_CLS}>Vendor</label>
            <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={INPUT_CLS}>
              <option value="">All</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={LABEL_CLS}>Stock</label>
            <select value={stockStatus} onChange={(e) => setStockStatus(e.target.value)} className={INPUT_CLS}>
              <option value="">All</option>
              {STOCK_STATUSES.map((s) => (
                <option key={s} value={s}>{stockStatusLabel(s)}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 text-right">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#56605a]">
              {materials.length} material{materials.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>

      {materials.length === 0 ? (
        <div className="rounded-lg border hairline bg-[rgba(214,203,179,0.35)] p-8 flex flex-col items-center gap-4 text-center">
          <div className="relative h-36 w-full max-w-md overflow-hidden rounded-lg">
            <Image src={IMAGES.kitchen} alt="" fill sizes="500px" className="object-cover" />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#56605a]">
            No materials yet, add your first stone/wood
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map((m) => (
            <MaterialCard key={m.id} material={m} onOpen={() => setModal({ material: m })} />
          ))}
        </div>
      )}

      {modal && (
        <MaterialModal
          material={modal.material}
          vendors={vendors}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            showToast("ok", "Material saved.");
            refresh();
          }}
          onDeleted={() => {
            setModal(null);
            showToast("ok", "Material deleted.");
            refresh();
          }}
          onError={(msg) => showToast("err", msg)}
        />
      )}
    </div>
  );
}

function MaterialCard({ material, onOpen }: { material: MaterialDto; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="surface-tile rounded-lg overflow-hidden text-left transition-colors hover:border-[var(--accent)] group"
    >
      <div className="relative h-40 w-full overflow-hidden bg-[rgba(214,203,179,0.35)]">
        <Image
          src={materialImageUrl(material)}
          alt={material.name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          unoptimized
          className="object-cover transition-transform group-hover:scale-[1.02]"
        />
        <span
          className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full border border-canvas"
          style={{ background: STOCK_DOT[material.stockStatus] ?? "#56605a" }}
          title={stockStatusLabel(material.stockStatus)}
          aria-label={stockStatusLabel(material.stockStatus)}
        />
      </div>
      <div className="p-4 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="font-display text-[16px] font-medium leading-snug">{material.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-[var(--radius-control)] border hairline-strong bg-canvas px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#56605a]">
            {materialCategoryLabel(material.category)}
          </span>
          {material.sku && <span className="font-mono text-[10px] text-[#56605a]">{material.sku}</span>}
        </div>
        <p className="font-mono text-sm text-[#c0964f]">
          {formatCost(material.costPerUnit, materialUnitLabel(material.unit))}
        </p>
        <p className="font-mono text-[10px] text-[#56605a]">
          {material.vendorName || "No vendor"}
        </p>
      </div>
    </button>
  );
}

function MaterialModal({
  material,
  vendors,
  onClose,
  onSaved,
  onDeleted,
  onError,
}: {
  material: MaterialDto | null;
  vendors: VendorDto[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    name: material?.name ?? "",
    category: material?.category ?? "stone",
    sku: material?.sku ?? "",
    vendorId: material?.vendorId ?? "",
    cost: material ? String(material.costPerUnit) : "",
    unit: material?.unit ?? "sqft",
    stockStatus: material?.stockStatus ?? "in_stock",
    imageUrl: material?.imageUrl ?? "",
  });
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>(
    material ? Object.entries(material.specs).map(([key, value]) => ({ key, value })) : []
  );
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const vendorSearch = vendors.find((v) => v.id === form.vendorId)?.name ?? "";

  async function uploadFile(file: File) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      onError("Only jpg, png or webp images are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      onError("Image must be under 10 MB.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/materials/upload", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        onError(j.error || "Upload failed");
        return;
      }
      setForm((f) => ({ ...f, imageUrl: j.image_url }));
    } catch {
      onError("Network problem. Upload not completed.");
    } finally {
      setUploading(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      onError("A material name is required.");
      return;
    }
    setBusy(true);
    try {
      const specsJson: Record<string, string> = {};
      for (const row of specs) {
        const k = row.key.trim();
        if (k) specsJson[k] = row.value.trim();
      }
      const body = {
        name: form.name,
        category: form.category,
        sku: form.sku,
        vendor_id: form.vendorId || null,
        cost_per_unit: Number(form.cost) || 0,
        unit: form.unit,
        stock_status: form.stockStatus,
        image_url: form.imageUrl,
        specs_json: specsJson,
      };
      const r = material
        ? await fetch(`/api/materials/${material.id}`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/materials", {
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
    if (!material) return;
    if (!window.confirm(`Delete ${material.name}?`)) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/materials/${material.id}`, {
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
      className="fixed inset-0 z-50 flex items-start justify-center px-4 py-8 overflow-y-auto"
      style={{ background: "rgba(18, 42, 32, 0.6)" }}
      role="dialog"
      aria-modal="true"
      aria-label={material ? `Edit ${material.name}` : "Add material"}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={save}
        className="w-full max-w-xl rounded-lg border hairline bg-canvas p-6 space-y-5"
      >
        <p className="chrome-pill inline-flex">{material ? "Edit material" : "Add material"}</p>

        <div>
          <label className={LABEL_CLS}>Image</label>
          <div
            className={`rounded-lg border-2 border-dashed p-3 transition-colors ${
              dragOver ? "border-[#c0964f]" : "border-[var(--line-strong)]"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) void uploadFile(f);
            }}
          >
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[rgba(214,203,179,0.35)]">
                {form.imageUrl ? (
                  <Image src={form.imageUrl} alt="" fill sizes="80px" unoptimized className="object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center font-mono text-[9px] uppercase tracking-[0.14em] text-[#56605a]">
                    {uploading ? "Uploading" : "No image"}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#56605a] mb-2">
                  Drop a jpg, png or webp here, up to 10 MB.
                </p>
                <label className="btn-ghost inline-flex cursor-pointer text-[10px]">
                  {uploading ? "Uploading..." : "Choose file"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadFile(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={LABEL_CLS}>Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={INPUT_CLS}>
              {MATERIAL_CATEGORIES.map((c) => (
                <option key={c} value={c}>{materialCategoryLabel(c)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>SKU</label>
            <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className={INPUT_CLS + " font-mono"} />
          </div>
          <div>
            <label className={LABEL_CLS}>Vendor</label>
            <input
              list="material-vendors"
              value={vendorSearch}
              onChange={(e) => {
                const match = vendors.find((v) => v.name.toLowerCase() === e.target.value.trim().toLowerCase());
                setForm({ ...form, vendorId: match?.id ?? "" });
              }}
              placeholder="Search vendors..."
              className={INPUT_CLS}
            />
            <datalist id="material-vendors">
              {vendors.map((v) => (
                <option key={v.id} value={v.name} />
              ))}
            </datalist>
          </div>
          <div>
            <label className={LABEL_CLS}>Cost per unit</label>
            <input type="number" min={0} step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className={INPUT_CLS + " font-mono"} />
          </div>
          <div>
            <label className={LABEL_CLS}>Unit</label>
            <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={INPUT_CLS}>
              {MATERIAL_UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={LABEL_CLS}>Stock status</label>
            <select value={form.stockStatus} onChange={(e) => setForm({ ...form, stockStatus: e.target.value })} className={INPUT_CLS}>
              {STOCK_STATUSES.map((s) => (
                <option key={s} value={s}>{stockStatusLabel(s)}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={LABEL_CLS}>Specs (finish, thickness, size, color, warranty...)</label>
          <div className="space-y-2">
            {specs.map((row, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2">
                <input
                  value={row.key}
                  onChange={(e) => {
                    const next = [...specs];
                    next[idx] = { ...next[idx], key: e.target.value };
                    setSpecs(next);
                  }}
                  placeholder="Key (e.g. finish)"
                  className={INPUT_CLS + " col-span-5 font-mono text-xs"}
                />
                <input
                  value={row.value}
                  onChange={(e) => {
                    const next = [...specs];
                    next[idx] = { ...next[idx], value: e.target.value };
                    setSpecs(next);
                  }}
                  placeholder="Value (e.g. honed)"
                  className={INPUT_CLS + " col-span-6 font-mono text-xs"}
                />
                <button
                  type="button"
                  onClick={() => setSpecs(specs.filter((_, i) => i !== idx))}
                  className="col-span-1 font-mono text-xs text-[#56605a] hover:text-ink"
                  aria-label={`Remove spec ${row.key || idx + 1}`}
                >
                  x
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setSpecs([...specs, { key: "", value: "" }])}
              className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent-deep hover:underline"
            >
              + Add spec
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          {material && (
            <button type="button" onClick={remove} disabled={busy} className="btn-ghost text-[var(--accent-deep)]">
              Delete
            </button>
          )}
          <button type="submit" disabled={busy || uploading} className="btn-primary flex-1">
            {busy ? "Saving..." : "Save material"}
          </button>
        </div>
      </form>
    </div>
  );
}
