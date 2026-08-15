"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { boardStatusLabel, type BoardDto } from "@/lib/boards";
import { relativeTime, shortDate } from "@/lib/proposals";
import { IconPlus, IconArrowLeft } from "@/components/icons";
import { IMAGES } from "@/lib/images";
import PlanLimitModal from "./PlanLimitModal";

type Toast = { kind: "ok" | "err"; msg: string };

const INPUT_CLS =
  "w-full bg-canvas border hairline rounded-[var(--radius-control)] px-3 py-2 text-sm focus:border-[var(--accent-deep)] focus:outline-none";

const LABEL_CLS =
  "block font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a] mb-2";


export default function AdminBoards({
  projectId,
  role,
}: {
  projectId: string;
  role: string;
}) {
  const router = useRouter();
  const [boards, setBoards] = useState<BoardDto[]>([]);
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  function showToast(kind: Toast["kind"], msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2600);
  }

  async function load() {
    const res = await fetch(`/api/boards?client_project_id=${encodeURIComponent(projectId)}`);
    if (res.ok) {
      const data = await res.json();
      setBoards(data.boards ?? []);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function createBoard() {
    setBusy(true);
    const res = await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_project_id: projectId, title: title.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      if (res.status === 402 && data?.code === "PLAN_LIMIT") {
        setPlanError(String(data.error ?? "Plan limit reached."));
        return;
      }
      showToast("err", data.error ?? "Could not create board");
      return;
    }
    setShowAdd(false);
    setTitle("");
    router.push(`/admin/client-projects/${projectId}/boards/${data.board.id}`);
  }

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
          <p className="chrome-pill mt-3 inline-flex">Moodboards</p>
          <h1 className="text-3xl md:text-5xl tracking-tighter mt-2">Boards.</h1>
          <p className="text-ink-mute text-sm mt-1">
            Figma-style material canvases for this engagement.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-[#122a20] px-4 py-2.5 text-sm font-medium text-[#ecece6] hover:opacity-90 transition-opacity"
        >
          <IconPlus size={16} /> Add board
        </button>
      </header>

      {toast && (
        <div
          role="status"
          className="surface-elevated px-4 py-3 text-sm rounded-[var(--radius-card)] text-accent-deep"
        >
          {toast.msg}
        </div>
      )}

      {boards.length === 0 ? (
        <div className="surface-tile rounded-[var(--radius-card)] p-8 flex flex-col items-center gap-3 text-center">
          <Image
            src={IMAGES.living}
            alt=""
            width={640}
            height={420}
            className="rounded-[var(--radius-card)] object-cover w-full max-w-xl"
          />
          <p className="font-display text-xl mt-2">No boards yet.</p>
          <p className="text-ink-mute text-sm max-w-md">
            Create the first moodboard and start dragging materials from your
            library onto the canvas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {boards.map((b) => (
            <Link
              key={b.id}
              href={`/admin/client-projects/${projectId}/boards/${b.id}`}
              className="surface-tile rounded-[var(--radius-card)] p-4 group hover:border-[#c0964f] transition-colors"
            >
              <BoardThumb board={b} />
              <div className="flex items-center justify-between gap-3 mt-3">
                <h3 className="font-display text-lg group-hover:text-accent-deep transition-colors">
                  {b.title}
                </h3>
                <span className="inline-flex shrink-0 rounded-[var(--radius-control)] border border-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-accent-deep">
                  {boardStatusLabel(b.status)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-[#56605a]">
                <span>{b.itemsCount ?? 0} items</span>
                <span>{b.updatedAt ? relativeTime(b.updatedAt) : "never edited"}</span>
              </div>
              {b.updatedAt && (
                <div className="mt-0.5 font-mono text-[10px] text-[#56605a]">
                  {shortDate(b.updatedAt)}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#122a20]/40 p-4"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="surface-elevated w-full max-w-sm rounded-[var(--radius-card)] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-2xl mb-4">New moodboard</h2>
            <label className={LABEL_CLS}>Board title</label>
            <input
              className={INPUT_CLS}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void createBoard()}
              placeholder="Living room palette"
              autoFocus
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowAdd(false)}
                className="rounded-[var(--radius-control)] border hairline px-4 py-2 text-sm text-ink-mute hover:text-ink transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void createBoard()}
                disabled={busy || !title.trim()}
                className="rounded-[var(--radius-control)] bg-[#122a20] px-4 py-2 text-sm font-medium text-[#ecece6] disabled:opacity-40"
              >
                {busy ? "Creating..." : "Create board"}
              </button>
            </div>
          </div>
        </div>
      )}
      <PlanLimitModal reason={planError} onClose={() => setPlanError(null)} />
    </div>
  );
}

/** Thumbnail grid built from the first 4 item images (client-side; the
 *  list API does not return items, so this loads the board lazily). */
function BoardThumb({ board }: { board: BoardDto }) {
  const [items, setItems] = useState<BoardDto["items"]>([]);

  useEffect(() => {
    if (!board.itemsCount || board.itemsCount === 0) return;
    void fetch(`/api/boards/${board.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.board?.items) setItems(d.board.items);
      })
      .catch(() => {});
  }, [board.id, board.itemsCount]);

  const thumbs = items
    .map((it) => it.material?.imageUrl)
    .filter((v): v is string => Boolean(v))
    .slice(0, 4);

  if (thumbs.length === 0) {
    return (
      <div className="relative aspect-[4/3] rounded-[var(--radius-card)] overflow-hidden bg-[#d6cbb3]/40">
        <Image
          src={IMAGES.living}
          alt=""
          fill
          className="object-cover opacity-50"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#56605a]">
            Empty canvas
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-1 rounded-[var(--radius-card)] overflow-hidden bg-[#d6cbb3]/40 aspect-[4/3]">
      {thumbs.map((src, i) => (
        <div key={i} className="relative">
          <Image
            src={src}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 16vw"
          />
        </div>
      ))}
      {thumbs.length < 4 &&
        Array.from({ length: 4 - thumbs.length }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-[#d6cbb3]/40" />
        ))}
    </div>
  );
}
