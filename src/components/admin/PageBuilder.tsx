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
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
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
    const meta = await fetch(`/api/admin/pages/${pageId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, status }),
    });
    const block = await fetch(`/api/admin/pages/${pageId}/blocks`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blocks: blocks.map((b, i) => ({
          type: b.type,
          data: b.data,
          order_index: i,
        })),
      }),
    });
    setBusy(false);
    if (!meta.ok || !block.ok) {
      alert("Save failed.");
      return;
    }
    alert("Page saved.");
  }

  function addBlock(type: BlockType) {
    const def = BLOCK_REGISTRY[type];
    const data = typeof def.defaultData === "object" && def.defaultData !== null
      ? structuredClone(def.defaultData)
      : {};
    setBlocks([...blocks, { type, data }]);
    setEditingIdx(blocks.length);
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
      return arrayMove(items, oldIndex, newIndex);
    });
  }

  return (
    <div className="space-y-8">
      <header className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center surface-elevated p-5 rounded-[var(--radius-card)]">
        <input
          className="input-line md:col-span-7"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Page title"
        />
        <select
          className="input-line md:col-span-3 bg-transparent"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
        <button
          onClick={save}
          disabled={busy}
          className="btn-primary md:col-span-2 disabled:opacity-50"
        >
          {busy ? "Saving" : "Save"}
        </button>
      </header>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl tracking-tight">Blocks · {blocks.length}</h2>
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
                editing={editingIdx === i}
                onEdit={() => setEditingIdx(editingIdx === i ? null : i)}
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
  editing,
  onEdit,
  onDuplicate,
  onRemove,
  onChange,
}: {
  id: string;
  index: number;
  block: Block;
  editing: boolean;
  onEdit: () => void;
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
  const [dataText, setDataText] = useState(() => JSON.stringify(block.data, null, 2));

  useEffect(() => {
    setDataText(JSON.stringify(block.data, null, 2));
  }, [block.data]);

  function commit() {
    try {
      const next = JSON.parse(dataText);
      onChange(next);
    } catch {
      alert("Invalid JSON in block data");
    }
  }

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
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onEdit}
            className="text-xs font-mono uppercase tracking-[0.18em] border-b hairline-strong pb-1"
          >
            {editing ? "Close" : "Edit"}
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
      {editing && (
        <div className="border-t hairline p-4 space-y-3">
          <textarea
            className="w-full font-mono text-xs bg-canvas border hairline rounded-[var(--radius-control)] p-3 h-64"
            value={dataText}
            onChange={(e) => setDataText(e.target.value)}
            onBlur={commit}
          />
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
            JSON edits commit on blur. Block schema is in src/cms/blocks/registry.ts.
          </p>
        </div>
      )}
    </article>
  );
}
