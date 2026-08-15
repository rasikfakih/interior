"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  DndContext,
  PointerSensor,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  formatBudgetLakhs,
  leadSourceLabel,
  leadStatusLabel,
  parseBudgetLakhs,
  type LeadDto,
} from "@/lib/leads";
import LeadCard from "./LeadCard";
import { IconPlus } from "@/components/icons";
import { IMAGES, KANBAN_ART } from "@/lib/images";

type Toast = { kind: "ok" | "err"; msg: string };

const INPUT_CLS =
  "w-full bg-canvas border hairline rounded-[var(--radius-control)] px-3 py-2 text-sm focus:border-[var(--accent-deep)] focus:outline-none";

const LABEL_CLS =
  "font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a]";

const COLUMNS: { key: string; label: string }[] = LEAD_STATUSES.map((s) => ({
  key: s,
  label: leadStatusLabel(s),
}));

export default function LeadKanban({ role }: { role: string }) {
  const [leads, setLeads] = useState<LeadDto[]>([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [search, setSearch] = useState("");
  const [reduceMotion, setReduceMotion] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  function showToast(kind: Toast["kind"], msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2400);
  }

  async function load() {
    setBusy(true);
    try {
      const r = await fetch(`/api/leads?limit=500`, { credentials: "include" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast("err", j.error || `Load failed (${r.status})`);
        return;
      }
      setLeads(j.leads ?? []);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reduced motion: kill dnd-kit's inline transform/opacity transitions.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduceMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // All filters are client-side on the board: the six columns stay
  // visible and cards within them filter down.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (status && l.status !== status) return false;
      if (source && l.source !== source) return false;
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        (l.phone ?? "").toLowerCase().includes(q)
      );
    });
  }, [leads, status, source, search]);

  const columns = useMemo(() => {
    const out: Record<
      string,
      { cards: LeadDto[]; count: number; budgetLakhs: number }
    > = {};
    for (const c of COLUMNS) out[c.key] = { cards: [], count: 0, budgetLakhs: 0 };
    for (const l of visible) {
      const col = out[l.status] ?? { cards: [], count: 0, budgetLakhs: 0 };
      col.cards.push(l);
      col.count += 1;
      col.budgetLakhs += parseBudgetLakhs(l.budget);
    }
    for (const c of COLUMNS) {
      out[c.key].budgetLakhs = Math.round(out[c.key].budgetLakhs * 10) / 10;
    }
    return out;
  }, [visible]);

  function columnIdFor(overId: string): string | null {
    if (overId.startsWith("col-")) return overId.slice(4);
    const lead = leads.find((l) => l.id === Number(overId));
    return lead ? lead.status : null;
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    const lead = leads.find((l) => l.id === active.id);
    if (!lead) return;
    const toStatus = columnIdFor(String(over.id));
    if (!toStatus || toStatus === lead.status) return;
    if (!LEAD_STATUSES.includes(toStatus as (typeof LEAD_STATUSES)[number])) {
      return;
    }

    // Optimistic move; revert on API failure.
    const snapshot = leads;
    setLeads((prev) =>
      prev.map((l) =>
        l.id === lead.id
          ? { ...l, status: toStatus, lastStatusChangeAt: new Date().toISOString() }
          : l
      )
    );
    try {
      const r = await fetch(`/api/leads/${lead.id}/status`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: toStatus }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setLeads(snapshot);
        showToast("err", j.error || `Move failed (${r.status})`);
        return;
      }
      showToast("ok", `${lead.name} moved to ${leadStatusLabel(toStatus)}.`);
    } catch {
      setLeads(snapshot);
      showToast("err", "Network problem. Move not saved.");
    }
  }

  return (
    <div className={`space-y-6 ${reduceMotion ? "reduce-motion-dnd" : ""}`}>
      {reduceMotion && (
        <style>{`.reduce-motion-dnd * { transition: none !important; animation: none !important; }`}</style>
      )}

      <header className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-end">
        <div className="md:col-span-9">
          <p className="chrome-pill mb-3 inline-flex">Lead pipeline</p>
          <h1 className="text-3xl md:text-5xl tracking-tighter">Board.</h1>
          <p className="text-ink-mute text-sm mt-2">
            Drag a lead across the funnel - new, qualified, site visit,
            quote sent, won or lost. Moves save immediately and column
            totals update live. Role:{" "}
            <span className="font-mono text-xs">{role}</span>.
          </p>
        </div>
        <div className="md:col-span-3 flex md:justify-end">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a]">
            {visible.length} of {leads.length} leads
          </span>
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

      {/* Search + filter bar (mirrors the list view controls). */}
      <div className="surface-tile p-4 rounded-[var(--radius-card)]">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5">
            <label className={LABEL_CLS} htmlFor="board-search">
              Search by name or phone
            </label>
            <input
              id="board-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name or phone..."
              className={INPUT_CLS + " mt-1"}
            />
          </div>
          <div className="md:col-span-3">
            <label className={LABEL_CLS} htmlFor="board-status">
              Status
            </label>
            <select
              id="board-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={INPUT_CLS + " mt-1"}
            >
              <option value="">All statuses</option>
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {leadStatusLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={LABEL_CLS} htmlFor="board-source">
              Source
            </label>
            <select
              id="board-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className={INPUT_CLS + " mt-1"}
            >
              <option value="">All sources</option>
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {leadSourceLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 flex md:justify-end">
            <button
              type="button"
              onClick={load}
              disabled={busy}
              className="btn-ghost w-full md:w-auto"
            >
              {busy ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:gap-4 lg:overflow-x-auto lg:pb-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.key}
              status={col.key}
              label={col.label}
              cards={columns[col.key]?.cards ?? []}
              budgetLakhs={columns[col.key]?.budgetLakhs ?? 0}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function KanbanColumn({
  status,
  label,
  cards,
  budgetLakhs,
}: {
  status: string;
  label: string;
  cards: LeadDto[];
  budgetLakhs: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${status}` });
  return (
    <div
      ref={setNodeRef}
      className={`flex w-full flex-col gap-3 rounded-lg border p-3 transition-colors lg:w-[320px] lg:min-w-[320px] lg:shrink-0 ${
        isOver
          ? "border-[#c0964f]"
          : "border-[var(--line-strong)]"
      } bg-[rgba(214,203,179,0.35)]`}
    >
      <header className="flex items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-sm font-medium">{label}</h3>
          <span className="rounded-full border hairline bg-canvas px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[#56605a]">
            {cards.length}
          </span>
        </div>
        <span className="font-mono text-xs text-[#c0964f]">
          {formatBudgetLakhs(budgetLakhs)}
        </span>
      </header>
      <SortableContext
        items={cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex min-h-[140px] flex-col gap-2">
          {cards.map((c) => (
            <LeadCard key={c.id} lead={c} />
          ))}
          {cards.length === 0 && <EmptyColumn status={status} label={label} />}
        </div>
      </SortableContext>
    </div>
  );
}

function EmptyColumn({ status, label }: { status: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border hairline bg-canvas/60 p-4 text-center">
      <IconPlus className="text-[#56605a]" size={18} aria-hidden />
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#56605a]">
        No leads in {label}
      </p>
      <div className="relative h-20 w-full overflow-hidden rounded-lg">
        <Image
          src={KANBAN_ART[status] ?? IMAGES.detail}
          alt=""
          fill
          sizes="300px"
          className="object-cover"
        />
      </div>
    </div>
  );
}
