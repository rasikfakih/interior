"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BOQ_CATEGORIES,
  BOQ_TEMPLATES,
  BOQ_UNITS,
  boqCategoryLabel,
  boqStatusLabel,
  calcItemAmount,
  formatIndianNumber,
  formatMoney,
  type BoqItemDto,
  type BoqVersionDto,
} from "@/lib/boq";
import { IconPlus, IconTrash, IconArrowLeft } from "@/components/icons";
import { IMAGES } from "@/lib/images";
import PlanLimitModal from "./PlanLimitModal";

type Toast = { kind: "ok" | "err"; msg: string };

const INPUT_CLS =
  "w-full bg-canvas border hairline rounded-[var(--radius-control)] px-2 py-1.5 text-sm font-mono focus:border-[var(--accent-deep)] focus:outline-none";

const LABEL_CLS =
  "block font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a] mb-2";

export default function AdminBOQ({
  projectId,
  role,
  initialVersionId,
}: {
  projectId: string;
  role: string;
  initialVersionId?: string;
}) {
  const [versions, setVersions] = useState<BoqVersionDto[]>([]);
  const [version, setVersion] = useState<BoqVersionDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [template, setTemplate] = useState<string>("2bhk");
  const [toast, setToast] = useState<Toast | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const loadSeq = useRef(0);

  function showToast(kind: Toast["kind"], msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2600);
  }

  const loadVersions = useCallback(async () => {
    const res = await fetch(`/api/boq?client_project_id=${encodeURIComponent(projectId)}`);
    if (!res.ok) return;
    const data = await res.json();
    setVersions(data.versions ?? []);
    return data.versions as BoqVersionDto[];
  }, [projectId]);

  const loadVersion = useCallback(
    async (versionId: string) => {
      const seq = ++loadSeq.current;
      const res = await fetch(`/api/boq/${versionId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (seq === loadSeq.current) setVersion(data.version ?? null);
    },
    []
  );

  // Load the version list once; then the requested (or latest) version.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadVersions().then((list) => {
      const wanted =
        list?.find((v) => v.id === initialVersionId) ?? list?.[0];
      if (wanted) void loadVersion(wanted.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, initialVersionId]);

  async function selectVersion(id: string) {
    setVersion(null);
    await loadVersion(id);
  }

  async function generateDraft() {
    setBusy(true);
    const res = await fetch("/api/boq/generate-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_project_id: projectId, template_name: template }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      if (res.status === 402 && data?.code === "PLAN_LIMIT") {
        setPlanError(String(data.error ?? "Plan limit reached."));
        return;
      }
      showToast("err", data.error ?? "Could not generate draft");
      return;
    }
    showToast("ok", `Generated ${data.version?.title ?? "draft"}`);
    const list = await loadVersions();
    const v = list?.find((x) => x.id === data.version?.id) ?? list?.[0];
    if (v) await loadVersion(v.id);
  }

  async function patchVersion(patch: { title?: string; status?: string; notes?: string }) {
    if (!version) return;
    const res = await fetch(`/api/boq/${version.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast("err", data.error ?? "Update failed");
      return;
    }
    setVersion(data.version);
    // Keep the selector in sync (status/title changed).
    setVersions((prev) => prev.map((v) => (v.id === data.version.id ? data.version : v)));
  }

  async function patchItem(id: string, patch: Partial<BoqItemDto>) {
    const res = await fetch(`/api/boq-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast("err", data.error ?? "Could not save item");
      return null;
    }
    return data.item as BoqItemDto | null;
  }

  async function deleteItem(id: string) {
    setVersion((v) =>
      v ? { ...v, items: v.items.filter((i) => i.id !== id) } : v
    );
    const res = await fetch(`/api/boq-items/${id}`, { method: "DELETE" });
    if (!res.ok) {
      showToast("err", "Could not delete item");
      await reloadVersion();
      return;
    }
    // Recompute total from the live table.
    setVersion((v) =>
      v
        ? {
            ...v,
            total: v.items.reduce((s, i) => s + i.amount, 0),
          }
        : v
    );
    await reloadVersion();
  }

  async function recalculate() {
    if (!version) return;
    setBusy(true);
    const res = await fetch(`/api/boq/${version.id}/recalculate`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      showToast("err", data.error ?? "Recalculate failed");
      return;
    }
    setVersion(data.version);
    setVersions((prev) => prev.map((v) => (v.id === data.version.id ? data.version : v)));
    showToast("ok", "Rates pulled from the material library and totals recalculated");
  }

  async function reloadVersion() {
    if (version) await loadVersion(version.id);
  }

  async function exportBoq(format: "json" | "csv") {
    if (!version) return;
    const res = await fetch(`/api/boq/${version.id}/export?format=${format}`);
    if (!res.ok) {
      showToast("err", "Export failed");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = format === "csv" ? `${version.title.replace(/\W+/g, "_")}.csv` : `${version.title.replace(/\W+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("ok", `${format.toUpperCase()} exported`);
  }

  const stats = useMemo(() => {
    if (!version) return { categories: 0, items: 0, avgGst: 0 };
    const cats = new Set(version.items.map((i) => i.category)).size;
    const gst = version.items.length
      ? version.items.reduce((s, i) => s + i.gstPct, 0) / version.items.length
      : 0;
    return { categories: cats, items: version.items.length, avgGst: Math.round(gst * 10) / 10 };
  }, [version]);

  return (
    <div className="space-y-6 min-h-[60vh]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href={`/admin/client-projects/${projectId}`}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute hover:text-ink transition-colors"
          >
            <IconArrowLeft size={14} /> Back to project
          </Link>
          <p className="chrome-pill mt-3 inline-flex">Bill of quantities</p>
          <h1 className="text-3xl md:text-5xl tracking-tighter mt-2">BOQ.</h1>
          <p className="text-ink-mute text-sm mt-1">
            Live material costs from your library, versioned per engagement.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="rounded-[var(--radius-control)] border hairline bg-canvas px-3 py-2 text-sm focus:outline-none"
            aria-label="Template"
          >
            {BOQ_TEMPLATES.map((t) => (
              <option key={t} value={t}>
                {t.toUpperCase()} template
              </option>
            ))}
          </select>
          <button
            onClick={() => void generateDraft()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-[#122a20] px-4 py-2 text-sm font-medium text-[#ecece6] hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <IconPlus size={16} /> New version from template
          </button>
        </div>
      </header>

      {toast && (
        <div
          role="status"
          className="surface-elevated px-4 py-3 text-sm rounded-[var(--radius-card)] text-accent-deep"
        >
          {toast.msg}
        </div>
      )}

      {versions.length === 0 && !version ? (
        <div className="surface-tile rounded-[var(--radius-card)] p-8 flex flex-col items-center gap-3 text-center">
          <Image
            src={IMAGES.detail}
            alt=""
            width={640}
            height={420}
            className="rounded-[var(--radius-card)] object-cover w-full max-w-xl"
          />
          <p className="font-display text-xl mt-2">No BOQ yet.</p>
          <p className="text-ink-mute text-sm max-w-md">
            Generate a draft from a standard template, then tune quantities
            and rates. Linked materials pull their cost straight from your
            library.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* version selector + total */}
          <div className="surface-tile rounded-[var(--radius-card)] p-5 flex flex-wrap items-center gap-4">
            <div className="min-w-0">
              <label className={LABEL_CLS}>Version</label>
              <div className="flex items-center gap-2">
                <select
                  value={version?.id ?? ""}
                  onChange={(e) => void selectVersion(e.target.value)}
                  className="rounded-[var(--radius-control)] border hairline bg-canvas px-3 py-2 text-sm focus:outline-none"
                  aria-label="BOQ version"
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.title} ({boqStatusLabel(v.status)})
                    </option>
                  ))}
                </select>
                {version && (
                  <span className="inline-flex rounded-[var(--radius-control)] border border-[var(--accent)] bg-[var(--accent-soft)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-accent-deep">
                    {boqStatusLabel(version.status)}
                  </span>
                )}
              </div>
            </div>
            <div className="ml-auto text-right">
              <label className={LABEL_CLS}>Total</label>
              <p className="font-mono text-2xl md:text-3xl text-[#c0964f] tracking-tight">
                {version ? formatMoney(version.total) : "-"}
              </p>
            </div>
          </div>

          {/* stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total" value={version ? formatMoney(version.total) : "-"} />
            <StatCard label="Categories" value={String(stats.categories)} />
            <StatCard label="Items" value={String(stats.items)} />
            <StatCard label="Avg GST" value={`${stats.avgGst}%`} />
          </div>

          {!version ? (
            <p className="text-ink-mute py-6">Loading version...</p>
          ) : (
            <>
              {/* items table */}
              <div className="surface-tile rounded-[var(--radius-card)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[960px] text-sm">
                    <thead>
                      <tr className="bg-[#d6cbb3]/40 font-mono text-[9px] uppercase tracking-[0.18em] text-[#56605a]">
                        <th className="px-3 py-2.5 text-left font-medium">Category</th>
                        <th className="px-3 py-2.5 text-left font-medium">Item</th>
                        <th className="px-3 py-2.5 text-left font-medium">Unit</th>
                        <th className="px-3 py-2.5 text-left font-medium">Qty</th>
                        <th className="px-3 py-2.5 text-left font-medium">Material rate</th>
                        <th className="px-3 py-2.5 text-left font-medium">Labour rate</th>
                        <th className="px-3 py-2.5 text-left font-medium">Wastage</th>
                        <th className="px-3 py-2.5 text-left font-medium">GST</th>
                        <th className="px-3 py-2.5 text-right font-medium">Amount</th>
                        <th className="px-3 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {version.items.map((item) => (
                        <ItemRow
                          key={item.id}
                          item={item}
                          onPatch={patchItem}
                          onDelete={() => void deleteItem(item.id)}
                          onRecalc={recalculate}
                        />
                      ))}
                      {version.items.length === 0 && (
                        <tr>
                          <td colSpan={10} className="px-4 py-6 text-center text-ink-mute">
                            No items yet. Add the first line below or generate a
                            draft from a template.
                          </td>
                        </tr>
                      )}
                      <AddItemRow
                        versionId={version.id}
                        onCreated={(item) => {
                          setVersion((v) => (v ? { ...v, items: [...v.items, item] } : v));
                          void reloadVersion();
                        }}
                      />
                    </tbody>
                  </table>
                </div>
              </div>

              {/* footer: notes + actions */}
              <div className="surface-tile rounded-[var(--radius-card)] p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={LABEL_CLS}>Notes</label>
                  <textarea
                    value={version.notes ?? ""}
                    onChange={(e) => setVersion((v) => (v ? { ...v, notes: e.target.value } : v))}
                    onBlur={() => {
                      if (version && version.notes !== undefined) {
                        void patchVersion({ notes: version.notes ?? "" });
                      }
                    }}
                    rows={3}
                    placeholder="Payment terms, inclusions, validity..."
                    className={INPUT_CLS + " resize-none"}
                  />
                </div>
                <div className="flex flex-col items-start md:items-end justify-end gap-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => void exportBoq("json")}
                      className="rounded-[var(--radius-control)] border hairline px-3 py-2 text-xs font-medium hover:bg-[#d6cbb3]/30 transition-colors"
                    >
                      Export JSON
                    </button>
                    <button
                      onClick={() => void exportBoq("csv")}
                      className="rounded-[var(--radius-control)] border hairline px-3 py-2 text-xs font-medium hover:bg-[#d6cbb3]/30 transition-colors"
                    >
                      Export CSV
                    </button>
                    <button
                      onClick={() => void recalculate()}
                      disabled={busy}
                      className="rounded-[var(--radius-control)] border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-xs font-medium text-accent-deep hover:opacity-90 transition-opacity disabled:opacity-40"
                    >
                      Pull latest costs
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {version.status === "draft" && (
                      <button
                        onClick={() => void patchVersion({ status: "sent" })}
                        className="rounded-[var(--radius-control)] border hairline px-3 py-2 text-xs font-medium hover:bg-[#d6cbb3]/30 transition-colors"
                      >
                        Mark as sent
                      </button>
                    )}
                    {["draft", "sent"].includes(version.status) && (
                      <button
                        onClick={() => void patchVersion({ status: "approved" })}
                        className="rounded-[var(--radius-control)] bg-[#122a20] px-3 py-2 text-xs font-medium text-[#ecece6] hover:opacity-90 transition-opacity"
                      >
                        Mark as approved
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
      <PlanLimitModal reason={planError} onClose={() => setPlanError(null)} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-tile rounded-[var(--radius-card)] p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#56605a]">{label}</p>
      <p className="mt-1.5 font-mono text-xl text-ink">{value}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Item row with inline editing                                        */
/* ------------------------------------------------------------------ */

function ItemRow({
  item,
  onPatch,
  onDelete,
  onRecalc,
}: {
  item: BoqItemDto;
  onPatch: (id: string, patch: Partial<BoqItemDto>) => Promise<BoqItemDto | null>;
  onDelete: () => void;
  onRecalc: () => void;
}) {
  const [draft, setDraft] = useState<BoqItemDto>(item);
  const [reverting, setReverting] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!reverting) setDraft(item);
  }, [item, reverting]);

  // Live amount from the current draft (optimistic).
  const liveAmount = calcItemAmount(
    draft.qty,
    draft.materialRate,
    draft.labourRate,
    draft.wastagePct,
    draft.gstPct
  );

  async function commit(field: keyof BoqItemDto, value: number) {
    setReverting(true);
    const saved = await onPatch(item.id, { [field]: value } as Partial<BoqItemDto>);
    setReverting(false);
    if (saved) {
      // Server returns the canonical row; keep the draft in sync so
      // subsequent edits start from persisted values.
      setDraft(saved);
    }
  }

  return (
    <tr className="border-t hairline hover:bg-[#d6cbb3]/15 transition-colors">
      <td className="px-3 py-2.5">
        <span className="inline-flex rounded-full bg-[#56605a]/15 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#56605a]">
          {boqCategoryLabel(draft.category)}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <p className="font-display text-[15px] leading-tight">{draft.itemName}</p>
        {draft.description && (
          <p className="text-xs text-ink-mute">{draft.description}</p>
        )}
        {draft.material && (
          <Link
            href="/admin/materials"
            className="mt-1 inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border hairline px-1.5 py-0.5 hover:border-[#c0964f] transition-colors"
          >
            {draft.material.imageUrl ? (
              <img
                src={draft.material.imageUrl}
                alt=""
                className="h-4 w-4 rounded object-cover"
              />
            ) : (
              <span className="h-4 w-4 rounded bg-[#d6cbb3]/60" />
            )}
            <span className="font-mono text-[10px] text-accent-deep">
              {draft.material.name} · Rs {formatIndianNumber(draft.material.costPerUnit)}
            </span>
          </Link>
        )}
        {draft.linkedBoardTitle && (
          <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[#56605a]">
            Board: {draft.linkedBoardTitle}
          </p>
        )}
      </td>
      <td className="px-3 py-2.5">
        <span className="font-mono text-xs text-ink-mute">{draft.unit}</span>
      </td>
      <td className="px-3 py-2.5">
        <input
          type="number"
          min={0}
          value={draft.qty}
          onChange={(e) => setDraft({ ...draft, qty: Number(e.target.value) })}
          onBlur={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v) && v !== item.qty) void commit("qty", v);
          }}
          className={INPUT_CLS + " w-20"}
          aria-label={`Quantity for ${draft.itemName}`}
        />
      </td>
      <td className="px-3 py-2.5">
        <input
          type="number"
          min={0}
          value={draft.materialRate}
          onChange={(e) => setDraft({ ...draft, materialRate: Number(e.target.value) })}
          onBlur={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v) && v !== item.materialRate) void commit("materialRate", v);
          }}
          className={INPUT_CLS + " w-24"}
          aria-label={`Material rate for ${draft.itemName}`}
        />
      </td>
      <td className="px-3 py-2.5">
        <input
          type="number"
          min={0}
          value={draft.labourRate}
          onChange={(e) => setDraft({ ...draft, labourRate: Number(e.target.value) })}
          onBlur={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v) && v !== item.labourRate) void commit("labourRate", v);
          }}
          className={INPUT_CLS + " w-24"}
          aria-label={`Labour rate for ${draft.itemName}`}
        />
      </td>
      <td className="px-3 py-2.5">
        <input
          type="number"
          min={0}
          value={draft.wastagePct}
          onChange={(e) => setDraft({ ...draft, wastagePct: Number(e.target.value) })}
          onBlur={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v) && v !== item.wastagePct) void commit("wastagePct", v);
          }}
          className={INPUT_CLS + " w-16"}
          aria-label={`Wastage for ${draft.itemName}`}
        />
      </td>
      <td className="px-3 py-2.5">
        <input
          type="number"
          min={0}
          value={draft.gstPct}
          onChange={(e) => setDraft({ ...draft, gstPct: Number(e.target.value) })}
          onBlur={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v) && v !== item.gstPct) void commit("gstPct", v);
          }}
          className={INPUT_CLS + " w-16"}
          aria-label={`GST for ${draft.itemName}`}
        />
      </td>
      <td className="px-3 py-2.5 text-right">
        <span className="font-mono text-sm font-semibold text-[#c0964f]">
          Rs {formatIndianNumber(liveAmount)}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right">
        <button
          onClick={onDelete}
          className="text-ink-mute hover:text-[#122a20] transition-colors"
          aria-label={`Delete ${draft.itemName}`}
        >
          <IconTrash size={15} />
        </button>
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/* Add item row                                                        */
/* ------------------------------------------------------------------ */

const EMPTY_ADD = {
  category: "civil",
  itemName: "",
  unit: "nos",
  qty: 1,
  materialRate: 0,
  labourRate: 0,
  wastagePct: 5,
  gstPct: 18,
};

function AddItemRow({
  versionId,
  onCreated,
}: {
  versionId: string;
  onCreated: (item: BoqItemDto) => void;
}) {
  const [form, setForm] = useState(EMPTY_ADD);
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!form.itemName.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/boq/${versionId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !data.item) return;
    onCreated(data.item as BoqItemDto);
    setForm(EMPTY_ADD);
  }

  return (
    <tr className="border-t hairline">
      <td className="px-3 py-2.5">
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className={INPUT_CLS}
          aria-label="New item category"
        >
          {BOQ_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {boqCategoryLabel(c)}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2.5" colSpan={2}>
        <div className="flex items-center gap-1.5">
          <input
            value={form.itemName}
            onChange={(e) => setForm({ ...form, itemName: e.target.value })}
            placeholder="New item name"
            className={INPUT_CLS + " flex-1"}
            aria-label="New item name"
          />
          <select
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            className={INPUT_CLS + " w-20"}
            aria-label="New item unit"
          >
            {BOQ_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <input
          type="number"
          min={0}
          value={form.qty}
          onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })}
          className={INPUT_CLS + " w-20"}
          aria-label="New item quantity"
        />
      </td>
      <td className="px-3 py-2.5">
        <input
          type="number"
          min={0}
          value={form.materialRate}
          onChange={(e) => setForm({ ...form, materialRate: Number(e.target.value) })}
          className={INPUT_CLS + " w-24"}
          aria-label="New item material rate"
        />
      </td>
      <td className="px-3 py-2.5">
        <input
          type="number"
          min={0}
          value={form.labourRate}
          onChange={(e) => setForm({ ...form, labourRate: Number(e.target.value) })}
          className={INPUT_CLS + " w-24"}
          aria-label="New item labour rate"
        />
      </td>
      <td className="px-3 py-2.5">
        <input
          type="number"
          value={form.wastagePct}
          onChange={(e) => setForm({ ...form, wastagePct: Number(e.target.value) })}
          className={INPUT_CLS + " w-16"}
          aria-label="New item wastage"
        />
      </td>
      <td className="px-3 py-2.5">
        <input
          type="number"
          value={form.gstPct}
          onChange={(e) => setForm({ ...form, gstPct: Number(e.target.value) })}
          className={INPUT_CLS + " w-16"}
          aria-label="New item GST"
        />
      </td>
      <td className="px-3 py-2.5" colSpan={2}>
        <button
          type="button"
          disabled={busy || !form.itemName.trim()}
          onClick={() => void add()}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] bg-[#122a20] px-3 py-1.5 text-xs font-medium text-[#ecece6] hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          <IconPlus size={13} /> Add
        </button>
      </td>
    </tr>
  );
}
