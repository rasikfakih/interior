"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { useGSAP, useReducedMotion } from "@/lib/use-gsap";
import {
  boardStatusLabel,
  newItemDto,
  type BoardDto,
  type BoardItemDto,
  type BoardItemMaterial,
} from "@/lib/boards";
import { useRealtimeBoard } from "./BoardRealtime";
import { BoardMaterialsSidebar } from "./BoardMaterialsSidebar";
import {
  IconArrowLeft,
  IconCheck,
  IconTrash,
  IconPlus,
} from "@/components/icons";

type Toast = { kind: "ok" | "err"; msg: string };

const INPUT_CLS =
  "w-full bg-canvas border hairline rounded-[var(--radius-control)] px-2.5 py-1.5 text-sm font-mono focus:border-[var(--accent-deep)] focus:outline-none";

const MIN_SIZE = 40;
const DEMO_FALLBACK = "/demo/living-room-1.jpg";

type DragMode =
  | { kind: "move"; startX: number; startY: number; origX: number; origY: number }
  | { kind: "resize"; handle: "nw" | "ne" | "sw" | "se"; startX: number; startY: number; orig: { x: number; y: number; w: number; h: number } }
  | { kind: "rotate"; startX: number; startY: number; origRot: number }
  | { kind: "pan"; startX: number; startY: number; origPan: { x: number; y: number } }
  | null;

export default function BoardCanvas({
  projectId,
  boardId,
  role,
}: {
  projectId: string;
  boardId: string;
  role: string;
}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const [board, setBoard] = useState<BoardDto | null>(null);
  const [items, setItems] = useState<BoardItemDto[]>([]);
  const [canvas, setCanvas] = useState({ zoom: 1, pan: { x: 0, y: 0 }, width: 2000, height: 1500 });
  const [title, setTitle] = useState("Moodboard");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "unsaved" | "saving">("saved");
  const [status, setStatus] = useState("draft");
  const [spaceDown, setSpaceDown] = useState(false);
  const [panning, setPanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragMode>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemsRef = useRef(items);
  const canvasRef = useRef(canvas);
  const selectedRef = useRef(selectedId);

  // Keep the latest values available to pointer handlers without
  // reading state during render.
  useEffect(() => {
    itemsRef.current = items;
    canvasRef.current = canvas;
    selectedRef.current = selectedId;
  }, [items, canvas, selectedId]);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId]
  );

  function showToast(kind: Toast["kind"], msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2600);
  }

  // ---- load ---------------------------------------------------------
  useEffect(() => {
    void fetch(`/api/boards/${boardId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.board) {
          setError("Board not found");
          return;
        }
        const b = d.board as BoardDto;
        setBoard(b);
        setItems(b.items);
        setCanvas(b.canvas);
        setTitle(b.title);
        setStatus(b.status);
        setSaveState("saved");
      })
      .catch(() => setError("Could not load board"));
  }, [boardId]);

  // ---- debounced save ----------------------------------------------
  async function doSave() {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    setSaveState("saving");
    const res = await fetch(`/api/boards/${boardId}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        canvas_json: canvasRef.current,
        items: itemsRef.current.map((i) => ({
          id: i.id,
          material_id: i.materialId,
          x: Math.round(i.x * 100) / 100,
          y: Math.round(i.y * 100) / 100,
          w: Math.round(i.w * 100) / 100,
          h: Math.round(i.h * 100) / 100,
          rotation: Math.round(i.rotation * 100) / 100,
          z_index: i.zIndex,
          meta_json: { note: i.note, scale: i.scale },
        })),
      }),
    });
    if (res.ok) {
      setSaveState("saved");
      const d = await res.json();
      if (d?.board?.updatedAt) setBoard((b) => (b ? { ...b, updatedAt: d.board.updatedAt } : b));
    } else {
      setSaveState("unsaved");
      showToast("err", "Save failed, retrying on next change");
    }
  }

  const scheduleSave = useCallback(() => {
    setSaveState("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void doSave();
    }, 800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  // ---- realtime merge -----------------------------------------------
  const realtime = useRealtimeBoard(boardId, items, setItems, setSelectedId, role);
  const lastCursorSent = useRef(0);
  function onViewportPointerMove(e: React.PointerEvent) {
    const now = Date.now();
    if (now - lastCursorSent.current > 80) {
      lastCursorSent.current = now;
      const rect = viewportRef.current?.getBoundingClientRect();
      if (rect) realtime.broadcast(e.clientX - rect.left, e.clientY - rect.top);
    }
  }

  // ---- mount animation ----------------------------------------------
  const scope = useRef<HTMLDivElement | null>(null);
  useGSAP(
    () => {
      if (!stageRef.current) return;
      const els = stageRef.current.querySelectorAll<HTMLElement>("[data-board-item]");
      gsap.fromTo(
        els,
        { opacity: 0, scale: 0.92 },
        { opacity: 1, scale: 1, duration: 0.35, stagger: 0.03, ease: "power2.out", overwrite: true }
      );
    },
    scope,
    [boardId, items.length]
  );

  // ---- mutation helpers ---------------------------------------------
  function updateItem(id: string, patch: Partial<BoardItemDto>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function deleteItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (selectedRef.current === id) setSelectedId(null);
    scheduleSave();
  }

  function addItemAt(material: BoardItemMaterial, x: number, y: number) {
    const topZ = itemsRef.current.reduce((m, i) => Math.max(m, i.zIndex), 0) + 1;
    const item = newItemDto(boardId, material, x, y);
    item.zIndex = topZ;
    setItems((prev) => [...prev, item]);
    setSelectedId(item.id);
    scheduleSave();
  }

  // ---- item drag (pointer) ------------------------------------------
  function onItemPointerDown(e: React.PointerEvent, item: BoardItemDto) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    setSelectedId(item.id);
    dragRef.current = {
      kind: "move",
      startX: e.clientX,
      startY: e.clientY,
      origX: item.x,
      origY: item.y,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onHandlePointerDown(e: React.PointerEvent, item: BoardItemDto, kind: DragMode) {
    e.stopPropagation();
    e.preventDefault();
    if (!kind) return;
    setSelectedId(item.id);
    dragRef.current = kind;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onCanvasPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const zoom = canvasRef.current.zoom;

    if (drag.kind === "move") {
      const dx = (e.clientX - drag.startX) / zoom;
      const dy = (e.clientY - drag.startY) / zoom;
      updateItem(selectedRef.current ?? "", {
        x: Math.round((drag.origX + dx) * 100) / 100,
        y: Math.round((drag.origY + dy) * 100) / 100,
      });
    } else if (drag.kind === "resize") {
      const dx = (e.clientX - drag.startX) / zoom;
      const dy = (e.clientY - drag.startY) / zoom;
      const o = drag.orig;
      let { x, y, w, h } = o;
      if (drag.handle === "se") {
        w = o.w + dx;
        h = o.h + dy;
      } else if (drag.handle === "nw") {
        x = o.x + dx;
        y = o.y + dy;
        w = o.w - dx;
        h = o.h - dy;
      } else if (drag.handle === "ne") {
        y = o.y + dy;
        w = o.w + dx;
        h = o.h - dy;
      } else {
        x = o.x + dx;
        w = o.w - dx;
        h = o.h + dy;
      }
      if (w < MIN_SIZE) {
        if (drag.handle === "nw" || drag.handle === "sw") x = o.x + o.w - MIN_SIZE;
        w = MIN_SIZE;
      }
      if (h < MIN_SIZE) {
        if (drag.handle === "nw" || drag.handle === "ne") y = o.y + o.h - MIN_SIZE;
        h = MIN_SIZE;
      }
      updateItem(selectedRef.current ?? "", {
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
        w: Math.round(w * 100) / 100,
        h: Math.round(h * 100) / 100,
      });
    } else if (drag.kind === "rotate") {
      const item = itemsRef.current.find((i) => i.id === selectedRef.current);
      if (item) {
        const cx = item.x + item.w / 2;
        const cy = item.y + item.h / 2;
        const rect = viewportRef.current?.getBoundingClientRect();
        const px = rect ? (e.clientX - rect.left - canvasRef.current.pan.x) / zoom : cx;
        const py = rect ? (e.clientY - rect.top - canvasRef.current.pan.y) / zoom : cy;
        const ang = (Math.atan2(py - cy, px - cx) * 180) / Math.PI + 90;
        updateItem(item.id, { rotation: Math.round(ang * 10) / 10 });
      }
    } else if (drag.kind === "pan") {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      setCanvas((c) => ({
        ...c,
        pan: { x: drag.origPan.x + dx, y: drag.origPan.y + dy },
      }));
    }
  }

  function onPointerUp() {
    if (dragRef.current) {
      const wasItemDrag =
        dragRef.current.kind === "move" ||
        dragRef.current.kind === "resize" ||
        dragRef.current.kind === "rotate";
      const wasPan = dragRef.current.kind === "pan";
      dragRef.current = null;
      if (wasPan) setPanning(false);
      if (wasItemDrag) scheduleSave();
    }
  }

  // ---- canvas pan via middle mouse / space --------------------------
  function onCanvasPointerDown(e: React.PointerEvent) {
    if (e.button === 1 || spaceDown) {
      e.preventDefault();
      dragRef.current = {
        kind: "pan",
        startX: e.clientX,
        startY: e.clientY,
        origPan: canvasRef.current.pan,
      };
      setPanning(true);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      return;
    }
    if (e.button === 0 && e.target === e.currentTarget) {
      setSelectedId(null);
    }
  }

  // ---- wheel zoom (ctrl) --------------------------------------------
  // React attaches wheel as passive; zoom needs preventDefault, so
  // this runs on a native non-passive listener.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cur = canvasRef.current;
      const px = (e.clientX - rect.left - cur.pan.x) / cur.zoom;
      const py = (e.clientY - rect.top - cur.pan.y) / cur.zoom;
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const next = Math.min(2, Math.max(0.25, cur.zoom * factor));
      setCanvas((c) => ({
        ...c,
        zoom: next,
        pan: {
          x: e.clientX - rect.left - px * next,
          y: e.clientY - rect.top - py * next,
        },
      }));
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- zoom slider --------------------------------------------------
  function setZoom(next: number) {
    const z = Math.min(2, Math.max(0.25, next));
    setCanvas((c) => ({ ...c, zoom: z }));
    scheduleSave();
  }

  // ---- drop from sidebar --------------------------------------------
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const materialId = e.dataTransfer.getData("text/material-id");
    if (!materialId) return;
    const material = materialsMap.current.get(materialId);
    if (!material) return;
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left - canvasRef.current.pan.x) / canvasRef.current.zoom;
    const y = (e.clientY - rect.top - canvasRef.current.pan.y) / canvasRef.current.zoom;
    addItemAt(material, Math.max(0, x - 100), Math.max(0, y - 100));
  }

  const materialsMap = useRef(new Map<string, BoardItemMaterial>());
  function setMaterials(materials: BoardItemMaterial[]) {
    materialsMap.current = new Map(materials.map((m) => [m.id, m]));
  }

  // ---- space key ----------------------------------------------------
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Space" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        setSpaceDown(true);
      }
      if (e.key === "Escape") setSelectedId(null);
      if ((e.key === "Delete" || e.key === "Backspace") && selectedRef.current) {
        const t = e.target as HTMLElement;
        if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) return;
        deleteItem(selectedRef.current);
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") setSpaceDown(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [deleteItem]);

  // ---- layer reorder -------------------------------------------------
  function reorderLayer(from: string, to: string) {
    setItems((prev) => {
      const list = [...prev];
      const fromIdx = list.findIndex((i) => i.id === from);
      const toIdx = list.findIndex((i) => i.id === to);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const [moved] = list.splice(fromIdx, 1);
      list.splice(toIdx, 0, moved);
      return list.map((i, idx) => ({ ...i, zIndex: idx + 1 }));
    });
    scheduleSave();
  }

  // ---- status / approve ---------------------------------------------
  async function patchBoard(patch: { title?: string; status?: string }) {
    const res = await fetch(`/api/boards/${boardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      if (patch.title) setTitle(patch.title);
      if (patch.status) {
        setStatus(patch.status);
        showToast("ok", patch.status === "approved" ? "Board approved" : `Status set to ${boardStatusLabel(patch.status)}`);
      }
    } else {
      showToast("err", "Could not update board");
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link href={`/admin/client-projects/${projectId}/boards`} className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute hover:text-ink transition-colors">
          <IconArrowLeft size={14} /> Back to boards
        </Link>
        <p className="text-ink-mute">{error}</p>
      </div>
    );
  }

  if (!board) {
    return <p className="text-ink-mute py-10">Loading board...</p>;
  }

  const layers = [...items].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="flex h-[calc(100vh-120px)] min-h-[560px] flex-col gap-3" ref={scope}>
      {/* ---- top bar ---- */}
      <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border hairline bg-canvas px-3 py-2">
        <Link
          href={`/admin/client-projects/${projectId}/boards`}
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute hover:text-ink transition-colors"
        >
          <IconArrowLeft size={14} /> Boards
        </Link>
        <div className="h-5 w-px bg-[#d6cbb3]" />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            if (title.trim() && title !== board.title) void patchBoard({ title: title.trim() });
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="min-w-0 flex-1 bg-transparent font-display text-lg focus:outline-none border-b border-transparent focus:border-[#c0964f]"
          aria-label="Board title"
        />
        <select
          value={status}
          onChange={(e) => void patchBoard({ status: e.target.value })}
          className="rounded-[var(--radius-control)] border hairline bg-canvas px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink focus:outline-none"
          aria-label="Board status"
        >
          {["draft", "approved", "archived"].map((s) => (
            <option key={s} value={s}>
              {boardStatusLabel(s)}
            </option>
          ))}
        </select>
        {status !== "approved" && (
          <button
            onClick={() => void patchBoard({ status: "approved" })}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] bg-[#122a20] px-3 py-1.5 text-xs font-medium text-[#ecece6] hover:opacity-90 transition-opacity"
          >
            <IconCheck size={14} /> Approve
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <input
            type="range"
            min={0.25}
            max={2}
            step={0.05}
            value={canvas.zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-24 accent-[#c0964f]"
            aria-label="Canvas zoom"
          />
          <span className="w-12 font-mono text-[11px] text-[#56605a]">
            {Math.round(canvas.zoom * 100)}%
          </span>
          <span className={`font-mono text-[10px] uppercase tracking-[0.14em] ${
            saveState === "saved" ? "text-[#56605a]" : saveState === "saving" ? "text-[#c0964f]" : "text-[#c0964f]"
          }`}>
            {saveState === "saved" ? "Saved" : saveState === "saving" ? "Saving..." : "Unsaved"}
          </span>
          {realtime.online.length > 0 && (
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#56605a]">
              {realtime.online.length} online
            </span>
          )}
        </div>
      </div>

      {toast && (
        <div
          role="status"
          className="surface-elevated px-4 py-2.5 text-sm rounded-[var(--radius-card)] text-accent-deep"
        >
          {toast.msg}
        </div>
      )}

      {/* ---- body ---- */}
      <div className="flex min-h-0 flex-1 gap-3">
        {/* left: materials */}
        <BoardMaterialsSidebar
          onAdd={(m) => addItemAt(m, canvas.width / 2 - 100, canvas.height / 2 - 100)}
          onMaterialsLoaded={setMaterials}
        />

        {/* center: canvas */}
        <div
          ref={viewportRef}
          data-testid="board-viewport"
          className="relative flex-1 overflow-hidden rounded-[var(--radius-card)] border hairline bg-[#ecece6]"
          onPointerDown={onCanvasPointerDown}
          onPointerMove={(e) => {
            onCanvasPointerMove(e);
            onViewportPointerMove(e);
          }}
          onPointerUp={onPointerUp}
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          style={{ cursor: panning ? "grabbing" : spaceDown ? "grab" : "default" }}
        >
          {/* grid dots */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle, #d6cbb3 1px, transparent 1px)",
              backgroundSize: `${24 * canvas.zoom}px ${24 * canvas.zoom}px`,
              backgroundPosition: `${canvas.pan.x}px ${canvas.pan.y}px`,
            }}
          />
          {/* remote cursors */}
          {Object.entries(realtime.cursors).map(([pid, c]) => (
            <div
              key={pid}
              className="pointer-events-none absolute z-50"
              style={{ left: c.x, top: c.y, transform: "translate(-2px, -2px)" }}
            >
              <span className="block h-3 w-3 rounded-full bg-[#c0964f]" />
              <span className="ml-1.5 rounded bg-[#c0964f] px-1.5 py-0.5 font-mono text-[9px] text-[#122a20]">
                Designer
              </span>
            </div>
          ))}
          <div
            ref={stageRef}
            className="absolute left-0 top-0"
            style={{
              width: canvas.width,
              height: canvas.height,
              transform: `translate(${canvas.pan.x}px, ${canvas.pan.y}px) scale(${canvas.zoom})`,
              transformOrigin: "0 0",
            }}
          >
            {items.map((item) => (
              <BoardItemView
                key={item.id}
                item={item}
                selected={selectedId === item.id}
                zoom={canvas.zoom}
                onPointerDown={onItemPointerDown}
                onHandlePointerDown={onHandlePointerDown}
                onDelete={() => deleteItem(item.id)}
                reduceMotion={reduceMotion}
              />
            ))}
          </div>
        </div>

        {/* right: properties */}
        <aside className="hidden w-[300px] shrink-0 flex-col gap-3 overflow-y-auto rounded-[var(--radius-card)] border hairline bg-canvas p-4 lg:flex">
          {selected ? (
            <ItemProperties
              item={selected}
              onChange={(patch) => {
                updateItem(selected.id, patch);
                scheduleSave();
              }}
              onDelete={() => deleteItem(selected.id)}
            />
          ) : (
            <CanvasProperties canvas={canvas} onChange={setCanvas} onSaved={() => scheduleSave()} />
          )}
        </aside>
      </div>

      {/* ---- bottom: layers ---- */}
      <div className="rounded-[var(--radius-card)] border hairline bg-canvas px-3 py-2">
        <div className="flex items-center gap-4 overflow-x-auto">
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-[#56605a]">
            Layers
          </span>
          {layers.length === 0 && (
            <span className="text-sm text-ink-mute">Drop materials onto the canvas to build the board.</span>
          )}
          {layers.map((item) => (
            <button
              key={item.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/layer-id", item.id);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const from = e.dataTransfer.getData("text/layer-id");
                if (from && from !== item.id) reorderLayer(from, item.id);
              }}
              onClick={() => setSelectedId(item.id)}
              className={`flex shrink-0 items-center gap-2 rounded-[var(--radius-control)] border px-2 py-1 text-xs transition-colors ${
                selectedId === item.id
                  ? "border-[#c0964f] bg-[var(--accent-soft)] text-ink"
                  : "border-transparent hover:bg-[#d6cbb3]/30 text-ink-mute"
              }`}
              style={{ cursor: "grab" }}
            >
              {item.material?.imageUrl ? (
                <img
                  src={item.material.imageUrl}
                  alt=""
                  className="h-6 w-6 rounded object-cover"
                />
              ) : (
                <span className="h-6 w-6 rounded bg-[#d6cbb3]/50" />
              )}
              <span className="max-w-[120px] truncate">{item.material?.name ?? "Material"}</span>
              <span className="font-mono text-[9px] text-[#56605a]">z {item.zIndex}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Item view                                                           */
/* ------------------------------------------------------------------ */

function BoardItemView({
  item,
  selected,
  zoom,
  onPointerDown,
  onHandlePointerDown,
  onDelete,
  reduceMotion,
}: {
  item: BoardItemDto;
  selected: boolean;
  zoom: number;
  onPointerDown: (e: React.PointerEvent, item: BoardItemDto) => void;
  onHandlePointerDown: (e: React.PointerEvent, item: BoardItemDto, mode: DragMode) => void;
  onDelete: () => void;
  reduceMotion: boolean;
}) {
  const handleHit = 12 / zoom;
  return (
    <div
      data-board-item
      className="absolute select-none"
      style={{
        left: item.x,
        top: item.y,
        width: item.w,
        height: item.h,
        zIndex: item.zIndex,
        transform: `rotate(${item.rotation}deg)`,
        transformOrigin: "center",
        cursor: "grab",
      }}
      onPointerDown={(e) => onPointerDown(e, item)}
    >
      {/* image / fallback */}
      <div
        className="relative h-full w-full overflow-hidden rounded-[8px] border hairline bg-[#d6cbb3]/40 shadow-sm"
        style={{
          outline: selected ? "2px solid #c0964f" : "none",
          outlineOffset: 2,
        }}
      >
        {item.material?.imageUrl ? (
          <img src={item.material.imageUrl} alt={item.material.name} draggable={false} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#56605a]">
              {item.material?.name ?? "Material"}
            </span>
          </div>
        )}
        {item.note && (
          <div className="absolute bottom-0 left-0 right-0 bg-[#122a20]/70 px-2 py-1 text-[10px] leading-tight text-[#ecece6] backdrop-blur-sm">
            {item.note}
          </div>
        )}
      </div>

      {/* selected chrome */}
      {selected && (
        <>
          {/* delete */}
          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute -top-3 -right-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#122a20] text-[#ecece6] hover:bg-[#c0964f] transition-colors"
            style={{ transform: `rotate(${-item.rotation}deg)` }}
            aria-label="Delete item"
          >
            <IconTrash size={12} />
          </button>

          {/* rotation handle */}
          <div
            onPointerDown={(e) =>
              onHandlePointerDown(e, item, {
                kind: "rotate",
                startX: e.clientX,
                startY: e.clientY,
                origRot: item.rotation,
              })
            }
            className="absolute -top-6 left-1/2 h-4 w-1 -translate-x-1/2 rounded-full bg-[#c0964f]"
            style={{ cursor: "grab", touchAction: "none" }}
          />

          {/* corner resize handles */}
          {(["nw", "ne", "sw", "se"] as const).map((h) => (
            <div
              key={h}
              onPointerDown={(e) =>
                onHandlePointerDown(e, item, {
                  kind: "resize",
                  handle: h,
                  startX: e.clientX,
                  startY: e.clientY,
                  orig: { x: item.x, y: item.y, w: item.w, h: item.h },
                })
              }
              className="absolute h-3 w-3 rounded-full border-2 border-[#c0964f] bg-[#ecece6]"
              style={{
                ...(h === "nw" && { left: -6, top: -6, cursor: "nwse-resize" }),
                ...(h === "ne" && { right: -6, top: -6, cursor: "nesw-resize" }),
                ...(h === "sw" && { left: -6, bottom: -6, cursor: "nesw-resize" }),
                ...(h === "se" && { right: -6, bottom: -6, cursor: "nwse-resize" }),
                touchAction: "none",
              }}
            />
          ))}
        </>
      )}
      {/* hidden hit guard keeps the whole card grabbable */}
      <div style={{ height: handleHit }} className="pointer-events-none" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Properties panels                                                   */
/* ------------------------------------------------------------------ */

function ItemProperties({
  item,
  onChange,
  onDelete,
}: {
  item: BoardItemDto;
  onChange: (patch: Partial<BoardItemDto>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="chrome-pill inline-flex">Properties</p>
        <button onClick={onDelete} className="text-ink-mute hover:text-[#122a20] transition-colors" aria-label="Delete item">
          <IconTrash size={15} />
        </button>
      </div>

      {item.material && (
        <div className="rounded-[var(--radius-control)] border hairline p-2.5 flex items-center gap-2.5">
          {item.material.imageUrl ? (
            <img src={item.material.imageUrl} alt="" className="h-10 w-10 rounded object-cover" />
          ) : (
            <span className="h-10 w-10 rounded bg-[#d6cbb3]/50" />
          )}
          <div className="min-w-0">
            <p className="truncate font-display text-sm">{item.material.name}</p>
            <p className="font-mono text-[10px] text-[#c0964f]">
              Rs {item.material.costPerUnit} / {item.material.unit}
            </p>
          </div>
          <Link
            href="/admin/materials"
            className="ml-auto shrink-0 font-mono text-[9px] uppercase tracking-[0.14em] text-accent-deep hover:underline"
          >
            Library
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <NumField label="X" value={item.x} onChange={(v) => onChange({ x: v })} />
        <NumField label="Y" value={item.y} onChange={(v) => onChange({ y: v })} />
        <NumField label="W" value={item.w} onChange={(v) => onChange({ w: v })} />
        <NumField label="H" value={item.h} onChange={(v) => onChange({ h: v })} />
      </div>

      <div>
        <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-[#56605a]">
          Rotation {Math.round(item.rotation)}°
        </label>
        <input
          type="range"
          min={-180}
          max={180}
          step={1}
          value={Math.max(-180, Math.min(180, item.rotation))}
          onChange={(e) => onChange({ rotation: Number(e.target.value) })}
          className="w-full accent-[#c0964f]"
        />
      </div>

      <div>
        <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-[#56605a]">
          Layer (z)
        </label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChange({ zIndex: item.zIndex - 1 })}
            className="rounded-[var(--radius-control)] border hairline px-2.5 py-1 text-sm hover:bg-[#d6cbb3]/30 transition-colors"
            aria-label="Lower layer"
          >
            −
          </button>
          <span className="font-mono text-sm">{item.zIndex}</span>
          <button
            onClick={() => onChange({ zIndex: item.zIndex + 1 })}
            className="rounded-[var(--radius-control)] border hairline px-2.5 py-1 text-sm hover:bg-[#d6cbb3]/30 transition-colors"
          >
            <IconPlus size={12} />
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-[#56605a]">
          Note
        </label>
        <textarea
          value={item.note}
          onChange={(e) => onChange({ note: e.target.value })}
          rows={3}
          placeholder="e.g. Foyer floor, 2cm thick, honed"
          className={INPUT_CLS + " resize-none"}
        />
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-[#56605a]">
        {label}
      </label>
      <input
        type="number"
        value={Math.round(value * 100) / 100}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(v);
        }}
        className={INPUT_CLS}
      />
    </div>
  );
}

function CanvasProperties({
  canvas,
  onChange,
  onSaved,
}: {
  canvas: { zoom: number; pan: { x: number; y: number }; width: number; height: number };
  onChange: (c: { zoom: number; pan: { x: number; y: number }; width: number; height: number }) => void;
  onSaved: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="chrome-pill inline-flex">Canvas</p>
      <p className="text-sm text-ink-mute">
        Select an item to edit its position, size, rotation and note.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <NumField
          label="Width"
          value={canvas.width}
          onChange={(v) => {
            onChange({ ...canvas, width: Math.max(400, v) });
            onSaved();
          }}
        />
        <NumField
          label="Height"
          value={canvas.height}
          onChange={(v) => {
            onChange({ ...canvas, height: Math.max(400, v) });
            onSaved();
          }}
        />
      </div>
      <div>
        <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-[#56605a]">
          Zoom {Math.round(canvas.zoom * 100)}%
        </label>
        <input
          type="range"
          min={0.25}
          max={2}
          step={0.05}
          value={canvas.zoom}
          onChange={(e) => {
            onChange({ ...canvas, zoom: Number(e.target.value) });
            onSaved();
          }}
          className="w-full accent-[#c0964f]"
        />
      </div>
      <p className="font-mono text-[10px] text-[#56605a]">
        Pan: middle-drag or Space + drag. Zoom: Ctrl + wheel.
      </p>
    </div>
  );
}
