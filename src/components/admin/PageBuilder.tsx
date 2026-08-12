"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import BlockPicker from "./BlockPicker";
import BlockEditor from "./BlockEditor";
import { BLOCK_REGISTRY, type BlockType } from "@/cms/blocks/registry";

type Block = {
  id?: number;
  type: BlockType;
  data: any;
};

type RevisionRow = {
  id: number;
  saved_at: string;
  payload?: { meta?: Record<string, unknown>; blocks?: unknown[] };
};

const SEO_ROBOTS_OPTIONS = ["index,follow", "noindex,nofollow"];
const LABEL_CLS = "font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute";
const INPUT_CLS =
  "input-line";

export default function PageBuilder({
  pageId,
  initialTitle,
  initialStatus,
  initialBlocks,
  initialSeoTitle = "",
  initialSeoDescription = "",
  initialRobots = "index,follow",
}: {
  pageId: number;
  initialTitle: string;
  initialStatus: string;
  initialBlocks: Block[];
  initialSeoTitle?: string;
  initialSeoDescription?: string;
  initialRobots?: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState(initialStatus);
  const [seoTitle, setSeoTitle] = useState(initialSeoTitle);
  const [seoDescription, setSeoDescription] = useState(initialSeoDescription);
  const [robots, setRobots] = useState(initialRobots);
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [showSeo, setShowSeo] = useState(false);
  const [showRevisions, setShowRevisions] = useState(false);
  const [revisions, setRevisions] = useState<RevisionRow[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, status, seoTitle, seoDescription, robots, blocks]);

  async function save() {
    setBusy(true);
    try {
      const r = await fetch(`/api/pages/${pageId}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          meta: { title, status, seoTitle, seoDescription, robots },
          blocks: blocks.map((b, i) => ({
            type: b.type,
            data: b.data,
            order_index: i,
          })),
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        flash(`Save failed: ${j.error || r.status}`);
        return;
      }
      setSavedAt(new Date().toLocaleTimeString());
      flash("Saved. A revision snapshot was recorded.");
    } finally {
      setBusy(false);
    }
  }

  async function loadRevisions() {
    setShowRevisions((open) => {
      const next = !open;
      if (next) {
        fetch(`/api/pages/${pageId}/revisions`, { credentials: "include" })
          .then((r) => r.json())
          .then((j) => setRevisions(Array.isArray(j.revisions) ? j.revisions : []))
          .catch(() => setRevisions([]));
      }
      return next;
    });
  }

  async function restoreRevision(revId: number) {
    if (!confirm("Restore this revision? Current state is kept as a snapshot too.")) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/pages/${pageId}/revisions/${revId}/restore`, {
        method: "POST",
        credentials: "include",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        flash(`Restore failed: ${j.error || r.status}`);
        return;
      }
      flash("Revision restored. Reloading editor state.");
      setTimeout(() => router.refresh(), 600);
    } finally {
      setBusy(false);
    }
  }

  async function preview() {
    setBusy(true);
    try {
      const r = await fetch(`/api/pages/${pageId}/preview`, {
        method: "POST",
        credentials: "include",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        flash(`Preview failed: ${j.error || r.status}`);
        return;
      }
      window.open(j.url, "_blank", "noopener,noreferrer");
    } finally {
      setBusy(false);
    }
  }

  async function duplicate() {
    setBusy(true);
    try {
      const r = await fetch(`/api/pages/${pageId}/duplicate`, {
        method: "POST",
        credentials: "include",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        flash(`Duplicate failed: ${j.error || r.status}`);
        return;
      }
      flash(`Duplicated to /${j.slug}.`);
      router.push(`/admin/pages/${j.id}`);
    } finally {
      setBusy(false);
    }
  }

  function addBlock(type: BlockType) {
    const def = BLOCK_REGISTRY[type];
    const data =
      typeof def.defaultData === "object" && def.defaultData !== null
        ? structuredClone(def.defaultData)
        : {};
    setBlocks([...blocks, { type, data }]);
    setOpenIdx(blocks.length);
  }

  function updateBlockData(idx: number, data: any) {
    setBlocks((prev) => {
      const cp = [...prev];
      cp[idx] = { ...cp[idx], data };
      return cp;
    });
  }

  function removeBlock(idx: number) {
    if (!confirm("Remove this block?")) return;
    setBlocks((prev) => prev.filter((_, i) => i !== idx));
    if (openIdx === idx) setOpenIdx(null);
  }

  function duplicateBlock(idx: number) {
    setBlocks((prev) => {
      const cp = [...prev];
      const src = cp[idx];
      cp.splice(idx + 1, 0, { type: src.type, data: structuredClone(src.data) });
      return cp;
    });
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setBlocks((items) => {
      const oldIndex = items.findIndex((_, i) => `b-${i}` === active.id);
      const newIndex = items.findIndex((_, i) => `b-${i}` === over.id);
      if (oldIndex < 0 || newIndex < 0) return items;
      const next = arrayMove(items, oldIndex, newIndex);
      if (openIdx != null) {
        if (openIdx === oldIndex) setOpenIdx(newIndex);
        else if (oldIndex < openIdx && newIndex >= openIdx) setOpenIdx(openIdx - 1);
        else if (oldIndex > openIdx && newIndex <= openIdx) setOpenIdx(openIdx + 1);
      }
      return next;
    });
  }

  return (
    <div className="space-y-8">
      <header className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center surface-elevated p-5 rounded-[var(--radius-card)]">
        <input
          className="input-line md:col-span-4"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Page title"
          maxLength={200}
        />
        <select
          className="input-line md:col-span-2 bg-transparent"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Status"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
        <div className="md:col-span-3 text-xs font-mono uppercase tracking-[0.18em] text-ink-mute">
          {savedAt ? `Saved ${savedAt}` : "Not saved"}
        </div>
        <div className="md:col-span-3 flex items-center justify-end gap-2 flex-wrap">
          <button onClick={preview} disabled={busy} className="btn-ghost text-xs h-9 px-3">
            Preview
          </button>
          <button onClick={duplicate} disabled={busy} className="btn-ghost text-xs h-9 px-3">
            Duplicate
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="btn-primary md:col-span-2 disabled:opacity-50"
          >
            {busy ? "Saving" : "Save"}
          </button>
        </div>
      </header>

      {toast && (
        <div
          role="status"
          className="surface-elevated px-4 py-3 text-sm text-accent rounded-[var(--radius-card)]"
        >
          {toast}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setShowSeo((v) => !v)}
          className="text-xs font-mono uppercase tracking-[0.18em] border-b hairline-strong pb-1"
        >
          SEO {showSeo ? "▲" : "▼"}
        </button>
        <button
          type="button"
          onClick={loadRevisions}
          className="text-xs font-mono uppercase tracking-[0.18em] border-b hairline-strong pb-1"
        >
          Revisions {showRevisions ? "▲" : "▼"}
        </button>
        <span className="ml-auto text-xs font-mono uppercase tracking-[0.18em] text-ink-mute">
          Blocks · {blocks.length}
        </span>
      </div>

      {showSeo && (
        <section className="surface-tile p-5 rounded-[var(--radius-card)] space-y-4">
          <p className={LABEL_CLS}>Search engine</p>
          <label className="block">
            <span className={LABEL_CLS}>SEO title</span>
            <input
              className={INPUT_CLS}
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder="Page title shown in search results"
              maxLength={200}
            />
          </label>
          <label className="block">
            <span className={LABEL_CLS}>SEO description</span>
            <textarea
              className={INPUT_CLS + " resize-y"}
              rows={2}
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              placeholder="One or two sentences for search engines"
              maxLength={500}
            />
          </label>
          <label className="block">
            <span className={LABEL_CLS}>Robots</span>
            <select
              className={INPUT_CLS + " bg-transparent"}
              value={robots}
              onChange={(e) => setRobots(e.target.value)}
            >
              {SEO_ROBOTS_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-ink-mute">
            The home page serves these in its &lt;meta&gt;. Save to apply.
          </p>
        </section>
      )}

      {showRevisions && (
        <section className="surface-tile p-5 rounded-[var(--radius-card)]">
          <p className={LABEL_CLS + " mb-3"}>
            History · {revisions.length} snapshot(s), newest first
          </p>
          {revisions.length === 0 ? (
            <p className="text-sm text-ink-mute">No revisions yet. Save the page to create one.</p>
          ) : (
            <ul className="divide-y hairline">
              {revisions.map((rev, idx) => (
                <li key={rev.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
                      #{rev.id}
                      {idx === 0 ? " · latest" : ""}
                    </p>
                    <p className="text-sm mt-0.5">
                      {rev.saved_at
                        ? new Date(rev.saved_at).toLocaleString()
                        : "unknown time"}
                      {" · "}
                      {rev.payload?.blocks?.length ?? 0} blocks
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => restoreRevision(rev.id)}
                    disabled={busy}
                    className="btn-ghost text-xs h-9 px-3 disabled:opacity-50"
                  >
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl tracking-tight">Blocks - {blocks.length}</h2>
        <div className="flex items-center gap-2">
          <BlockPicker onPick={addBlock} />
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={blocks.map((_, i) => `b-${i}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {blocks.map((b, i) => (
              <SortableBlock
                key={i}
                id={`b-${i}`}
                index={i}
                block={b}
                open={openIdx === i}
                onToggle={() => setOpenIdx(openIdx === i ? null : i)}
                onDuplicate={() => duplicateBlock(i)}
                onRemove={() => removeBlock(i)}
                onChange={(data) => updateBlockData(i, data)}
              />
            ))}
            {blocks.length === 0 && (
              <div className="surface-tile p-8 text-center">
                <p className="chrome-pill mb-3 inline-flex">Empty page</p>
                <p className="text-ink-mute">Add a block from above.</p>
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableBlock({
  id,
  block,
  index,
  open,
  onToggle,
  onDuplicate,
  onRemove,
  onChange,
}: {
  id: string;
  index: number;
  block: Block;
  open: boolean;
  onToggle: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onChange: (data: any) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const def = BLOCK_REGISTRY[block.type];
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className="surface-elevated rounded-[var(--radius-card)]"
    >
      <header className="flex items-center justify-between p-4 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            aria-label="Drag block"
            className="cursor-grab text-ink-mute px-2"
            {...attributes}
            {...listeners}
          >
            ⋮⋮
          </button>
          <p className="chrome-pill">{block.type}</p>
          <p className="text-sm text-ink-mute truncate">{def.label}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
            #{index + 1}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggle}
            className="text-xs font-mono uppercase tracking-[0.18em] border-b hairline-strong pb-1"
          >
            {open ? "Close" : "Edit"}
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            className="text-xs font-mono uppercase tracking-[0.18em] border-b hairline-strong pb-1"
          >
            Duplicate
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-xs font-mono uppercase tracking-[0.18em] text-ink border-b border-[var(--accent-soft)] pb-1"
          >
            Remove
          </button>
        </div>
      </header>
      {open && (
        <div className="border-t hairline p-4">
          <BlockEditor
            type={block.type}
            value={block.data}
            onChange={onChange}
          />
        </div>
      )}
    </article>
  );
}
