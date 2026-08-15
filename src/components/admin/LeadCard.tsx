"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { leadSourceLabel, type LeadDto } from "@/lib/leads";

function relativeTime(s: string | null): string {
  if (!s) return "-";
  const t = new Date(s).getTime();
  if (Number.isNaN(t)) return s;
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(s).toISOString().slice(0, 10);
}

/** One draggable lead card on the kanban board. The whole card is the
 *  drag handle (PointerSensor with a distance constraint so plain
 *  clicks still pass through). */
export default function LeadCard({ lead }: { lead: LeadDto }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lead.id,
    data: { status: lead.status },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex cursor-grab flex-col gap-1.5 rounded-lg border bg-canvas p-3 active:cursor-grabbing ${
        isDragging
          ? "border-[#c0964f] opacity-70 shadow-[0_10px_24px_-12px_rgba(18,42,32,0.4)]"
          : "border-[var(--line-strong)]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-[15px] font-medium leading-snug">
          {lead.name}
        </p>
        <span className="flex shrink-0 items-center gap-1 pt-0.5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: (lead.score ?? 0) > 0 ? "#c0964f" : "#56605a" }}
            aria-hidden
          />
          <span className="font-mono text-[10px] text-[#56605a]">
            {lead.score ?? 0}
          </span>
        </span>
      </div>
      {lead.phone ? (
        <p className="font-mono text-xs text-[#56605a]">{lead.phone}</p>
      ) : null}
      <div className="mt-auto flex items-center justify-between gap-2">
        <span className="inline-flex rounded border hairline-strong bg-canvas px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#56605a]">
          {leadSourceLabel(lead.source)}
        </span>
        {lead.budget ? (
          <span className="font-mono text-xs text-[#c0964f]">{lead.budget}</span>
        ) : null}
      </div>
      <p className="font-mono text-[10px] text-[#56605a]">
        {relativeTime(lead.createdAt)}
      </p>
      {/* Module 3: close the loop from the board - open a client
          project for this lead, or jump to the project's proposal. */}
      <Link
        href={
          lead.clientProjectId
            ? `/admin/client-projects/${lead.clientProjectId}/proposal?lead_id=${lead.id}`
            : `/admin/client-projects/new?lead_id=${lead.id}`
        }
        className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#c0964f] hover:underline"
      >
        {lead.clientProjectId ? "Generate proposal" : "Create project"}
      </Link>
    </div>
  );
}
