"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { PortalPayload } from "@/lib/portal";
import { boardStatusLabel } from "@/lib/boards";
import { boqCategoryLabel, boqStatusLabel } from "@/lib/boq";
import {
  clientProjectStatusLabel,
  formatRupees,
  relativeTime,
  shortDate,
} from "@/lib/proposals";
import { IconCheck, IconX } from "@/components/icons";

type Tab = "overview" | "boards" | "boq" | "photos" | "snags" | "comments";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "boards", label: "Boards" },
  { key: "boq", label: "BOQ" },
  { key: "photos", label: "Photos" },
  { key: "snags", label: "Snags" },
  { key: "comments", label: "Comments" },
];

const STATUS_BADGE: Record<string, string> = {
  open: "text-[#56605a] border-[#56605a]/40 bg-[#56605a]/10",
  fixed: "text-[#3f6b4f] border-[#3f6b4f]/40 bg-[#3f6b4f]/10",
  verified: "text-[#3f6b4f] border-[#3f6b4f]/40 bg-[#3f6b4f]/10",
};

type Toast = { kind: "ok" | "err"; msg: string };

export default function ClientPortal({
  token,
  initial,
  host,
}: {
  token: string;
  initial: PortalPayload;
  host: string | null;
}) {
  const [data, setData] = useState<PortalPayload>(initial);
  const [tab, setTab] = useState<Tab>("overview");
  const [toast, setToast] = useState<Toast | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [openBoard, setOpenBoard] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { brand, project, boards, boqVersions, siteLogs, snags, comments, stats } = data;
  const palette = brand.palette;

  function showToast(kind: Toast["kind"], msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2600);
  }

  async function approve(type: "board" | "boq", targetId: string) {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/portal/${token}/approve`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, target_id: targetId }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast("err", j.error || `Approve failed (${r.status})`);
        return;
      }
      setData((d) => ({
        ...d,
        boards:
          type === "board"
            ? d.boards.map((b) =>
                b.id === targetId ? { ...b, status: "approved" } : b
              )
            : d.boards,
        boqVersions:
          type === "boq"
            ? d.boqVersions.map((v) =>
                v.id === targetId ? { ...v, status: "approved" } : v
              )
            : d.boqVersions,
        approvals: [
          {
            id: String(j.approval?.id ?? crypto.randomUUID()),
            type,
            targetId,
            status: "approved",
            comment: j.approval?.comment ?? null,
            createdAt: j.approval?.createdAt ?? new Date().toISOString(),
          },
          ...d.approvals,
        ],
      }));
      showToast("ok", type === "board" ? "Board approved." : "BOQ approved.");
    } catch {
      showToast("err", "Network problem. Approve not saved.");
    } finally {
      setBusy(false);
    }
  }

  async function approveAll() {
    const draftBoards = boards.filter((b) => b.status === "draft");
    const draftBoq = boqVersions.filter((v) => v.status === "draft");
    const targets: { type: "board" | "boq"; id: string }[] = [
      ...draftBoards.map((b) => ({ type: "board" as const, id: b.id })),
      ...draftBoq.map((v) => ({ type: "boq" as const, id: v.id })),
    ];
    if (targets.length === 0) {
      showToast("ok", "Nothing pending approval.");
      return;
    }
    for (const t of targets) {
      await approve(t.type, t.id);
    }
  }

  async function sendComment(message: string): Promise<boolean | null> {
    if (!message.trim()) return null;
    const r = await fetch(`/api/portal/${token}/comment`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      showToast("err", j.error || `Send failed (${r.status})`);
      return null;
    }
    const c = j.comment;
    setData((d) => ({
      ...d,
      comments: [
        ...d.comments,
        {
          id: String(c?.id ?? crypto.randomUUID()),
          author: "client",
          message: String(c?.message ?? message),
          createdAt: c?.createdAt ?? new Date().toISOString(),
        },
      ],
    }));
    return true;
  }

  const draftCount =
    boards.filter((b) => b.status === "draft").length +
    boqVersions.filter((v) => v.status === "draft").length;

  return (
    <main
      className="min-h-dvh bg-[var(--bg)] text-[var(--ink)]"
      style={{ "--bg": palette.paper, "--ink": palette.ink, "--ink-mute": palette.muted, "--accent": palette.accent } as React.CSSProperties}
    >

      {/* Top bar. */}
      <header className="border-b hairline sticky top-0 z-30 bg-[var(--bg)]">
        <div className="container-page h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span
              aria-hidden
              className="w-6 h-6 rounded-[3px] shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, #d8dad4 0%, #6a6f68 50%, #2a2e2a 100%)",
              }}
            />
            <div className="min-w-0">
              <p className="text-sm md:text-base font-medium tracking-[-0.01em] truncate">
                {project.name}
              </p>
              {project.clientName && (
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-mute)] truncate">
                  {project.clientName}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex rounded-lg border border-[var(--accent)] bg-[var(--accent)]/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
              {project.statusLabel}
            </span>
            {draftCount > 0 && (
              <button
                onClick={() => void approveAll()}
                disabled={busy}
                className="rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--bg)] bg-[var(--accent)] hover:opacity-90 disabled:opacity-50"
              >
                Approve {draftCount}
              </button>
            )}
          </div>
        </div>
      </header>

      {toast && (
        <div
          role="status"
          className={`fixed bottom-4 right-4 z-50 rounded-lg px-4 py-3 text-sm shadow-lg ${
            toast.kind === "ok"
              ? "bg-[var(--ink)] text-[var(--bg)]"
              : "bg-[#8a2f2f] text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Tabs. */}
      <div className="container-page pt-6 pb-4">
        <div role="tablist" aria-label="Portal views" className="flex gap-1 overflow-x-auto border-b hairline">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] -mb-px border-b-2 whitespace-nowrap transition-colors ${
                tab === t.key
                  ? "border-[var(--accent)] text-[var(--ink)]"
                  : "border-transparent text-[var(--ink-mute)] hover:text-[var(--ink)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="container-page pb-16">
        {tab === "overview" && (
          <OverviewTab
            project={project}
            stats={stats}
            siteLogs={siteLogs}
            brand={brand.name}
          />
        )}
        {tab === "boards" && (
          <BoardsTab
            boards={boards}
            approve={approve}
            busy={busy}
            openBoard={openBoard}
            setOpenBoard={setOpenBoard}
          />
        )}
        {tab === "boq" && (
          <BoqTab
            versions={boqVersions}
            approve={approve}
            busy={busy}
            projectName={project.name}
          />
        )}
        {tab === "photos" && (
          <PhotosTab siteLogs={siteLogs} setLightbox={setLightbox} />
        )}
        {tab === "snags" && <SnagsTab snags={snags} setLightbox={setLightbox} />}
        {tab === "comments" && (
          <CommentsTab comments={comments} onSend={sendComment} />
        )}
      </div>

      {/* Footer. */}
      <footer className="border-t hairline mt-auto">
        <div className="container-page py-8 flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-xs text-[var(--ink-mute)]">
            {brand.address}
          </p>
          <div className="flex items-center gap-6">
            {!brand.whiteLabel && (
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-mute)]">
                Powered by Studio OS
              </p>
            )}
            <p className="font-mono text-xs text-[var(--ink-mute)]">
              {brand.name}
            </p>
          </div>
        </div>
      </footer>

      {/* Lightbox. */}
      {lightbox && (
        <button
          aria-label="Close photo"
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <img
            src={lightbox}
            alt=""
            className="max-h-[90dvh] max-w-full rounded-lg object-contain"
          />
          <span className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white">
            <IconX size={18} />
          </span>
        </button>
      )}
    </main>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border hairline bg-canvas p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-mute)] mb-2">
        {label}
      </p>
      <p className={`font-mono text-2xl ${accent ? "text-[var(--accent)]" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function OverviewTab({
  project,
  stats,
  siteLogs,
  brand,
}: {
  project: PortalPayload["project"];
  stats: PortalPayload["stats"];
  siteLogs: PortalPayload["siteLogs"];
  brand: string;
}) {
  const progress = Math.min(100, Math.max(4, siteLogs.length * 12));
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Address", value: project.address || "-" },
    {
      label: "Area",
      value: project.areaSqft ? `${Math.round(project.areaSqft)} sqft` : "-",
    },
    {
      label: "Budget",
      value: (
        <span className="font-mono text-[var(--accent)]">
          {formatRupees(project.budget)}
        </span>
      ),
    },
    { label: "Timeline", value: "Per proposal" },
  ];
  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Moodboards" value={String(stats.boards)} />
        <StatCard label="BOQ total" value={formatRupees(stats.boqTotal)} accent />
        <StatCard label="Photos" value={String(stats.photos)} />
        <StatCard label="Open snags" value={String(stats.openSnags)} />
      </section>

      <section className="rounded-lg border hairline bg-canvas p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-mute)] mb-4">
          Project at a glance
        </p>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
          {rows.map((r) => (
            <div key={r.label}>
              <dt className="block font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-mute)] mb-1.5">
                {r.label}
              </dt>
              <dd className="text-sm">{r.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-lg border hairline bg-canvas p-6">
        <div className="flex items-baseline justify-between gap-4 mb-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-mute)]">
            On-site progress
          </p>
          <p className="font-mono text-xs text-[var(--ink-mute)]">
            {siteLogs.length} log{siteLogs.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="h-2 rounded-full bg-[#d6cbb3]/50 overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-[var(--ink-mute)] mt-3">
          Your project is live with {brand}. New photos, boards and snag
          updates appear here as work happens.
        </p>
      </section>
    </div>
  );
}

function BoardThumb({
  items,
  title,
}: {
  items: PortalPayload["boards"][number]["items"];
  title: string;
}) {
  const imgs = items
    .map((i) => i.material?.imageUrl)
    .filter((u): u is string => Boolean(u));
  if (imgs.length === 0) {
    return (
      <div className="relative h-32 w-full overflow-hidden rounded-lg">
        <Image src="/demo/kitchen-1.jpg" alt="" fill sizes="300px" unoptimized className="object-cover" />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-4 gap-1">
      {imgs.slice(0, 4).map((src, i) => (
        <div key={i} className="relative aspect-square overflow-hidden rounded-md">
          <Image src={src} alt="" fill sizes="120px" unoptimized className="object-cover" />
        </div>
      ))}
    </div>
  );
}

function BoardsTab({
  boards,
  approve,
  busy,
  openBoard,
  setOpenBoard,
}: {
  boards: PortalPayload["boards"];
  approve: (type: "board" | "boq", id: string) => Promise<void>;
  busy: boolean;
  openBoard: string | null;
  setOpenBoard: (id: string | null) => void;
}) {
  const board = boards.find((b) => b.id === openBoard) ?? null;
  return (
    <div className="space-y-6">
      {boards.length === 0 ? (
        <div className="rounded-lg border hairline bg-canvas p-8 text-center">
          <p className="text-sm text-[var(--ink-mute)]">
            No moodboards shared yet. Your studio will add boards here as the
            design takes shape.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {boards.map((b) => (
            <div key={b.id} className="rounded-lg border hairline bg-canvas p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => setOpenBoard(b.id)}
                  className="font-display text-lg text-left hover:underline"
                >
                  {b.title}
                </button>
                <span className="inline-flex rounded-lg border border-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--accent)]">
                  {boardStatusLabel(b.status)}
                </span>
              </div>
              <button onClick={() => setOpenBoard(b.id)} className="block w-full text-left">
                <BoardThumb items={b.items} title={b.title} />
              </button>
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-mute)]">
                  {b.items.length} items
                </p>
                {b.status === "draft" ? (
                  <button
                    onClick={() => void approve("board", b.id)}
                    disabled={busy}
                    className="rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--bg)] bg-[var(--accent)] hover:opacity-90 disabled:opacity-50"
                  >
                    Approve board
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[#3f6b4f]">
                    <IconCheck size={13} /> Approved
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Read-only board canvas modal. */}
      {board && (
        <div
          role="dialog"
          aria-label={board.title}
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4"
        >
          <div className="w-full max-w-4xl rounded-lg bg-[#ECECE6] p-5 max-h-[92dvh] overflow-auto">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="font-display text-xl">{board.title}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#56605a] mt-0.5">
                  {board.items.length} items
                </p>
              </div>
              <button
                aria-label="Close"
                onClick={() => setOpenBoard(null)}
                className="rounded-full p-2 text-[#122A20] hover:bg-[#d6cbb3]/50"
              >
                <IconX size={18} />
              </button>
            </div>
            <div className="relative w-full overflow-hidden rounded-lg border border-[#d6cbb3]" style={{ aspectRatio: "4 / 3", backgroundImage: "radial-gradient(#c9bda4 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
              {board.items.map((it) => {
                const left = (it.x / (board.canvas?.width ?? 2000)) * 100;
                const top = (it.y / (board.canvas?.height ?? 1500)) * 100;
                const w = (it.w / (board.canvas?.width ?? 2000)) * 100;
                const h = (it.h / (board.canvas?.height ?? 1500)) * 100;
                return (
                  <div
                    key={it.id}
                    className="absolute overflow-hidden rounded-lg border border-[#d6cbb3] shadow-sm"
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      width: `${w}%`,
                      height: `${h}%`,
                      transform: `rotate(${it.rotation}deg)`,
                      zIndex: it.zIndex,
                    }}
                  >
                    {it.material?.imageUrl ? (
                      <img src={it.material.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-[#d6cbb3]/60 flex items-center justify-center">
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#56605a] px-2 text-center">
                          {it.material?.name || "Material"}
                        </span>
                      </div>
                    )}
                    {it.note && (
                      <span className="absolute bottom-1 left-1 rounded bg-[#122A20]/80 px-1.5 py-0.5 font-mono text-[9px] text-[#ECECE6]">
                        {it.note}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BoqTab({
  versions,
  approve,
  busy,
  projectName,
}: {
  versions: PortalPayload["boqVersions"];
  approve: (type: "board" | "boq", id: string) => Promise<void>;
  busy: boolean;
  projectName: string;
}) {
  const approved = versions.find((v) => v.status === "approved") ?? versions[0] ?? null;
  if (!approved) {
    return (
      <div className="rounded-lg border hairline bg-canvas p-8 text-center">
        <p className="text-sm text-[var(--ink-mute)]">
          No cost estimate shared yet for {projectName}.
        </p>
      </div>
    );
  }
  const categories = [...new Set(approved.items.map((i) => i.category))];
  const catTotals = categories.map((c) => ({
    category: c,
    total: approved.items
      .filter((i) => i.category === c)
      .reduce((sum, i) => sum + Number(i.amount ?? 0), 0),
  }));
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-mute)] mb-1">
            {approved.title}
          </p>
          <p className="font-mono text-3xl md:text-4xl text-[var(--accent)]">
            {formatRupees(approved.total)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex rounded-lg border border-[var(--accent)] bg-[var(--accent)]/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
            {boqStatusLabel(approved.status)}
          </span>
          {approved.status === "draft" && (
            <button
              onClick={() => void approve("boq", approved.id)}
              disabled={busy}
              className="rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--bg)] bg-[var(--accent)] hover:opacity-90 disabled:opacity-50"
            >
              Approve estimate
            </button>
          )}
        </div>
      </div>

      {approved.items.length > 0 && (
        <div className="rounded-lg border hairline bg-canvas overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b hairline text-left font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--ink-mute)]">
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 font-medium">Item</th>
                <th className="px-4 py-2.5 font-medium text-right">Qty</th>
                <th className="px-4 py-2.5 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {approved.items.map((item) => (
                <tr key={item.id} className="border-b hairline last:border-b-0">
                  <td className="px-4 py-2.5">
                    <span className="inline-flex rounded-md bg-[#56605a]/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[#56605a]">
                      {boqCategoryLabel(item.category)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-display">{item.itemName}</td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {item.qty} {item.unit}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {formatRupees(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {catTotals.length > 1 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 px-4 py-3 border-t hairline">
              {catTotals.map((c) => (
                <div key={c.category}>
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--ink-mute)]">
                    {boqCategoryLabel(c.category)}
                  </p>
                  <p className="font-mono text-sm">{formatRupees(c.total)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PhotosTab({
  siteLogs,
  setLightbox,
}: {
  siteLogs: PortalPayload["siteLogs"];
  setLightbox: (url: string | null) => void;
}) {
  const groups = new Map<string, typeof siteLogs>();
  for (const log of siteLogs) {
    const key = log.logDate ?? "Unscheduled";
    groups.set(key, [...(groups.get(key) ?? []), log]);
  }
  if (siteLogs.length === 0) {
    return (
      <div className="rounded-lg border hairline bg-canvas p-8 text-center">
        <p className="text-sm text-[var(--ink-mute)]">
          No site photos yet. Diary photos appear here as work happens.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-8">
      {[...groups.entries()].map(([date, logs]) => (
        <section key={date} className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--ink-mute)]">
            {shortDate(date)}
          </p>
          {logs.map((log) => (
            <div key={log.id} className="rounded-lg border hairline bg-canvas p-5 space-y-4">
              {log.workDone && <p className="font-display text-lg">{log.workDone}</p>}
              {log.voiceTranscript && (
                <p className="text-sm italic text-[var(--ink-mute)]">
                  {log.voiceTranscript}
                </p>
              )}
              <div className="flex items-center gap-4">
                <p className="font-mono text-xs text-[var(--ink-mute)]">
                  {log.labourCount} labour
                </p>
                {log.weather && (
                  <p className="font-mono text-xs text-[var(--ink-mute)]">
                    {log.weather}
                  </p>
                )}
              </div>
              {log.photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {log.photos.map((src, i) => (
                    <button
                      key={i}
                      onClick={() => setLightbox(src)}
                      className="relative aspect-square overflow-hidden rounded-lg group"
                    >
                      <img
                        src={src}
                        alt=""
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

function SnagsTab({
  snags,
  setLightbox,
}: {
  snags: PortalPayload["snags"];
  setLightbox: (url: string | null) => void;
}) {
  if (snags.length === 0) {
    return (
      <div className="rounded-lg border hairline bg-canvas p-8 text-center">
        <p className="text-sm text-[var(--ink-mute)]">
          No snags raised. The site is running clean.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {snags.map((s) => (
        <div key={s.id} className="rounded-lg border hairline bg-canvas p-4 flex gap-4">
          {s.photoUrl && (
            <button
              onClick={() => setLightbox(s.photoUrl)}
              className="relative w-24 h-24 shrink-0 overflow-hidden rounded-lg"
            >
              <img src={s.photoUrl} alt="" className="h-full w-full object-cover" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-md border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] ${STATUS_BADGE[s.status] ?? STATUS_BADGE.open}`}>
                {s.status}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--ink-mute)]">
                {s.priority} priority
              </span>
              {s.createdAt && (
                <span className="font-mono text-[10px] text-[var(--ink-mute)]">
                  {relativeTime(s.createdAt)}
                </span>
              )}
            </div>
            <p className="text-sm mt-2">{s.description}</p>
            {s.assignedTo && (
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-mute)] mt-1.5">
                {s.assignedTo}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function CommentsTab({
  comments,
  onSend,
}: {
  comments: PortalPayload["comments"];
  onSend: (message: string) => Promise<boolean | null>;
}) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [comments.length]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || sending) return;
    setSending(true);
    const ok = await onSend(message);
    if (ok) setMessage("");
    setSending(false);
  }

  return (
    <div className="max-w-2xl">
      {comments.length === 0 ? (
        <div className="rounded-lg border hairline bg-canvas p-8 text-center mb-4">
          <p className="text-sm text-[var(--ink-mute)]">
            No messages yet. Ask anything about your project.
          </p>
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          {comments.map((c) => (
            <div
              key={c.id}
              className={`rounded-lg border hairline p-4 max-w-[85%] ${
                c.author === "client"
                  ? "ml-auto bg-[var(--accent)]/10 border-[var(--accent)]/30"
                  : "mr-auto bg-canvas"
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--ink-mute)]">
                  {c.author === "client" ? "You" : "Studio"}
                </p>
                {c.createdAt && (
                  <p className="font-mono text-[10px] text-[var(--ink-mute)]">
                    {relativeTime(c.createdAt)}
                  </p>
                )}
              </div>
              <p className="text-sm whitespace-pre-line">{c.message}</p>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}
      <form onSubmit={submit} className="flex gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write a message to your studio..."
          rows={2}
          className="flex-1 rounded-lg border hairline bg-canvas px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !message.trim()}
          className="rounded-lg px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--bg)] bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 self-end"
        >
          Send
        </button>
      </form>
    </div>
  );
}
