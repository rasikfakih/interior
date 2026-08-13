"use client";

import { useEffect, useState } from "react";
import { MediaRow } from "./media-types";
import MediaPicker from "./MediaPicker";
import AdminModelPreview from "./AdminModelPreview";
import { ProjectRoom } from "@/lib/rooms";
import { IconArrowUp, IconArrowDown, IconPlus } from "../icons";

type Toast = { kind: "ok" | "err"; msg: string };

const INPUT_CLS =
  "w-full bg-canvas border hairline rounded-[var(--radius-control)] px-3 py-2 text-sm focus:border-[var(--accent-deep)] focus:outline-none";
const LABEL_CLS = "op-label";

type Draft = {
  name: string;
  description: string;
  model_3d: string;
  is_published: boolean;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  description: "",
  model_3d: "",
  is_published: true,
};

export default function ProjectRoomsManager({
  projectId,
}: {
  projectId: number;
}) {
  const [rooms, setRooms] = useState<ProjectRoom[]>([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  function showToast(kind: Toast["kind"], msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2600);
  }

  async function load() {
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/${projectId}/rooms`, {
        credentials: "include",
      });
      const j = await r.json().catch(() => []);
      if (!r.ok) {
        showToast("err", "Could not load rooms.");
        return;
      }
      setRooms(j ?? []);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startEdit(room: ProjectRoom | null) {
    if (room) {
      setEditingId(room.id);
      setDraft({
        name: room.name,
        description: room.description ?? "",
        model_3d: room.model_3d ?? "",
        is_published: room.is_published,
      });
    } else {
      setEditingId(null);
      setDraft(EMPTY_DRAFT);
    }
  }

  async function save() {
    if (!draft.name.trim()) {
      showToast("err", "Room name is required.");
      return;
    }
    setBusy(true);
    try {
      const body = JSON.stringify(draft);
      const r = editingId !== null
        ? await fetch(`/api/projects/${projectId}/rooms/${editingId}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body,
          })
        : await fetch(`/api/projects/${projectId}/rooms`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body,
          });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast("err", j.error || `Save failed (${r.status})`);
        return;
      }
      showToast("ok", editingId !== null ? "Room updated." : "Room added.");
      startEdit(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function move(room: ProjectRoom, dir: -1 | 1) {
    const idx = rooms.findIndex((r) => r.id === room.id);
    const swap = rooms[idx + dir];
    if (!swap) return;
    const a = { ...room, order_index: swap.order_index };
    const b = { ...swap, order_index: room.order_index };
    setRooms((prev) => {
      const next = [...prev];
      next[idx] = b;
      next[idx + dir] = a;
      return next;
    });
    await Promise.all([
      fetch(`/api/projects/${projectId}/rooms/${a.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_index: a.order_index }),
      }),
      fetch(`/api/projects/${projectId}/rooms/${b.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_index: b.order_index }),
      }),
    ]);
  }

  async function del(room: ProjectRoom) {
    if (typeof window !== "undefined") {
      const ok = window.confirm(`Delete room "${room.name}"?`);
      if (!ok) return;
    }
    const r = await fetch(`/api/projects/${projectId}/rooms/${room.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!r.ok) {
      showToast("err", "Delete failed.");
      return;
    }
    if (editingId === room.id) startEdit(null);
    showToast("ok", `Deleted ${room.name}.`);
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="chrome-pill inline-flex">Walkthrough rooms</p>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            {rooms.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => startEdit(null)}
          className="btn-primary h-9 px-4 text-[10px]"
        >
          <IconPlus size={14} aria-hidden />
          Add room
        </button>
      </div>

      {toast && (
        <div
          role="status"
          className={`op-banner ${toast.kind === "err" ? "op-banner--bad" : "op-banner--good"}`}
        >
          {toast.msg}
        </div>
      )}

      {rooms.length === 0 && !busy && (
        <p className="text-sm text-ink-mute">
          No rooms yet. Add one to power the room-by-room 3D tour on the
          public project page (each room can carry its own GLB from the media
          library).
        </p>
      )}

      {rooms.map((room, i) => (
        <div
          key={room.id}
          className="surface-tile grid grid-cols-1 gap-3 rounded-[var(--radius-card)] p-4 md:grid-cols-12 md:items-center"
        >
          <div className="md:col-span-5">
            <div className="flex items-center gap-2">
              <p className="text-base tracking-tight">{room.name}</p>
              <span
                className={`op-chip ${
                  room.is_published ? "op-chip--good" : ""
                }`}
              >
                {room.is_published ? "live" : "draft"}
              </span>
            </div>
            <p className="mt-1 truncate font-mono text-xs text-ink-mute">
              {room.model_3d || "uses project model"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 md:col-span-7 md:justify-end">
            <button
              type="button"
              onClick={() => move(room, -1)}
              disabled={i === 0}
              className="op-btn-sm"
              aria-label={`Move ${room.name} up`}
            >
              <IconArrowUp aria-hidden size={14} />
            </button>
            <button
              type="button"
              onClick={() => move(room, 1)}
              disabled={i === rooms.length - 1}
              className="op-btn-sm"
              aria-label={`Move ${room.name} down`}
            >
              <IconArrowDown aria-hidden size={14} />
            </button>
            <button
              type="button"
              onClick={() => startEdit(room)}
              className="op-btn-sm"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => del(room)}
              className="op-btn-sm op-btn-sm--danger"
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      {(editingId !== null || rooms.length === 0) && (
        <div className="surface-tile space-y-4 rounded-[var(--radius-card)] p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={LABEL_CLS}>Room name</label>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className={INPUT_CLS + " mt-1"}
                placeholder="Living room"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 pb-2">
                <input
                  type="checkbox"
                  checked={draft.is_published}
                  onChange={(e) =>
                    setDraft({ ...draft, is_published: e.target.checked })
                  }
                />
                <span className="text-sm">Published on the public site</span>
              </label>
            </div>
          </div>
          <div>
            <label className={LABEL_CLS}>Description (shown beside the 3D)</label>
            <textarea
              rows={2}
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
              className={INPUT_CLS + " mt-1 resize-none"}
              placeholder="What happens in this room? Materials, light, use…"
            />
          </div>
          <div>
            <label className={LABEL_CLS}>
              3D model (.glb) - pick from Media or paste a URL
            </label>
            <div className="mt-1 flex gap-2">
              <input
                value={draft.model_3d}
                onChange={(e) => setDraft({ ...draft, model_3d: e.target.value })}
                className={INPUT_CLS}
                placeholder="/uploads/models/…"
              />
              <MediaPicker
                accept="glb"
                label="Pick GLB"
                onPick={(item: MediaRow) =>
                  setDraft({ ...draft, model_3d: item.url ?? "" })
                }
              />
            </div>
            <p className="op-hint">
              Leave empty to fall back to the project&apos;s 3D model.
            </p>
          </div>

          <AdminModelPreview
            modelUrl={draft.model_3d}
            label={editingId !== null ? "Previewing this room's model" : "Previewing new room's model"}
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="btn-primary h-9 px-4 text-[10px] disabled:opacity-50"
            >
              {busy ? "Saving..." : editingId !== null ? "Save room" : "Add room"}
            </button>
            {editingId !== null && (
              <button
                type="button"
                onClick={() => startEdit(null)}
                className="btn-ghost h-9 px-4 text-[10px]"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
