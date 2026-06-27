"use client";

import { useEffect, useState } from "react";
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

export default function PageBuilder({
  pageId,
  initialTitle,
  initialStatus,
  initialBlocks,
}: {
  pageId: number;
  initialTitle: string;
  initialStatus: string;
  initialBlocks: Block[];
}) {
  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState(initialStatus);
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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
  }, [title, status, blocks]);

  async function save() {
    setBusy(true);
    try {
      const meta = await fetch(`/api/pages/${pageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, status }),
      });
      const block = await fetch(`/api/pages/${pageId}/blocks`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          blocks: blocks.map((b, i) => ({
            type: b.type,
            data: b.data,
            order_index: i,
          })),
        }),
      });
      if (!meta.ok) {
        const j = await meta.json().catch(() => ({}));
        alert(`Save failed: ${j.error || meta.status}`);
        return;
      }
      if (!block.ok) {
        const j = await block.json().catch(() => ({}));
        alert(`Save failed: ${j.error || block.status}`);
        return;
      }
      setSavedAt(new Date().toLocaleTimeString());
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
          className="input-line md:col-span-5"
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
        <button
          onClick={save}
          disabled={busy}
          className="btn-primary md:col-span-2 disabled:opacity-50"
        >
          {busy ? "Saving" : "Save"}
        </button>
      </header>

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
            className="text-xs font-mono uppercase tracking-[0.18em] text-warm border-b border-[var(--accent-warm-soft)] pb-1"
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
