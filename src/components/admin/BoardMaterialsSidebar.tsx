"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MATERIAL_CATEGORIES,
  materialCategoryLabel,
  formatCost,
  type MaterialDto,
} from "@/lib/materials";
import { IconPlus } from "@/components/icons";
import { materialImageUrl } from "@/lib/images";

/** Material list the designer drags onto the board. */
export function BoardMaterialsSidebar({
  onAdd,
  onMaterialsLoaded,
}: {
  onAdd: (m: MaterialDto) => void;
  onMaterialsLoaded: (materials: MaterialDto[]) => void;
}) {
  const [materials, setMaterials] = useState<MaterialDto[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    void fetch("/api/materials")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const list: MaterialDto[] = d?.materials ?? [];
        setMaterials(list);
        onMaterialsLoaded(list);
        setBusy(false);
      })
      .catch(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return materials.filter((m) => {
      if (category && m.category !== category) return false;
      if (!needle) return true;
      return (
        m.name.toLowerCase().includes(needle) ||
        (m.sku ?? "").toLowerCase().includes(needle)
      );
    });
  }, [materials, q, category]);

  return (
    <aside className="flex w-[260px] shrink-0 flex-col rounded-[var(--radius-card)] border hairline bg-canvas">
      <div className="border-b hairline p-3">
        <p className="chrome-pill mb-2 inline-flex">Materials</p>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or SKU"
          className="w-full bg-canvas border hairline rounded-[var(--radius-control)] px-2.5 py-1.5 text-sm focus:border-[var(--accent-deep)] focus:outline-none"
          aria-label="Search materials"
        />
        <div className="mt-2 flex flex-wrap gap-1">
          <button
            onClick={() => setCategory("")}
            className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] transition-colors ${
              category === "" ? "bg-[#122a20] text-[#ecece6]" : "bg-[#d6cbb3]/40 text-[#56605a] hover:text-ink"
            }`}
          >
            All
          </button>
          {MATERIAL_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(category === c ? "" : c)}
              className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] transition-colors ${
                category === c ? "bg-[#122a20] text-[#ecece6]" : "bg-[#d6cbb3]/40 text-[#56605a] hover:text-ink"
              }`}
            >
              {materialCategoryLabel(c)}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {busy ? (
          <p className="px-2 py-4 text-sm text-ink-mute">Loading materials...</p>
        ) : filtered.length === 0 ? (
          <p className="px-2 py-4 text-sm text-ink-mute">
            {materials.length === 0
              ? "No materials in the library yet. Add them under Materials first."
              : "Nothing matches your filters."}
          </p>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((m) => (
              <div
                key={m.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/material-id", m.id);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                className="group flex cursor-grab items-center gap-2 rounded-[var(--radius-control)] border hairline p-1.5 hover:border-[#c0964f] transition-colors"
                title="Drag onto the canvas, or click to add at center"
              >
                <img
                  src={materialImageUrl(m)}
                  alt=""
                  draggable={false}
                  className="h-11 w-11 shrink-0 rounded object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] leading-tight">{m.name}</p>
                  <p className="font-mono text-[10px] text-[#c0964f]">
                    {formatCost(m.costPerUnit, m.unit)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdd(m);
                  }}
                  className="shrink-0 rounded-full border border-[#d6cbb3] p-1 text-[#56605a] opacity-0 transition-opacity hover:border-[#c0964f] hover:text-accent-deep group-hover:opacity-100"
                  aria-label={`Add ${m.name} to canvas`}
                >
                  <IconPlus size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
