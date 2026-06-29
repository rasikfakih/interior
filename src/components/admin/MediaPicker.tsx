"use client";

import { useEffect, useRef, useState } from "react";
import {
  formatBytes,
  kindFromMime,
  MAX_BYTES,
  MEDIATYPE_LABEL,
  type MediaKind,
  type MediaListResponse,
  type MediaRow,
  type UploadIntent,
} from "@/components/admin/media-types";

type PickedItem = {
  item: MediaRow;
  signedUrl: string | null;
};

type Props = {
  onPick:
    | ((item: MediaRow, signedUrl: string | null) => void)
    | ((items: PickedItem[]) => void);
  accept?: "all" | MediaKind;
  label?: string;
  /**
   * WordPress-grade multi-select: when `true`, picking a tile
   * toggles it in the local cart instead of closing the dialog.
   * Click "Use selection" to commit the array of picked items.
   */
  multi?: boolean;
};

export default function MediaPicker({
  onPick,
  accept = "all",
  label = "Pick asset",
  multi = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [kind, setKind] = useState<"all" | MediaKind>(accept);
  const [picking, setPicking] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<number, PickedItem>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setKind(accept);
    setSelected({});
  }, [accept, open]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    const qp = new URLSearchParams({ limit: "60" });
    if (kind !== "all") qp.set("kind", kind);
    (async () => {
      try {
        const r = await fetch(`/api/media/list?${qp.toString()}`, {
          credentials: "include",
        });
        if (!r.ok) throw new Error(`list ${r.status}`);
        const body = (await r.json()) as MediaListResponse;
        setItems(body.rows);
      } catch (e: any) {
        setError(e.message ?? "list failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [kind, open]);

  async function resolveUrl(item: MediaRow): Promise<string | null> {
    if (item.url && /^https?:\/\//.test(item.url)) return item.url;
    const r = await fetch(`/api/media/${item.id}/sign`, {
      credentials: "include",
    });
    const j = (await r.json().catch(() => ({}))) as { url?: string };
    return j.url ?? null;
  }

  async function pickSingle(item: MediaRow) {
    setPicking(item.id);
    setError(null);
    try {
      const url = await resolveUrl(item);
      (onPick as (i: MediaRow, url: string | null) => void)(item, url);
      setOpen(false);
    } finally {
      setPicking(null);
    }
  }

  function togglePicked(item: MediaRow, signedUrl: string | null) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        next[item.id] = { item, signedUrl };
      }
      return next;
    });
  }

  async function pickMulti(item: MediaRow) {
    setPicking(item.id);
    setError(null);
    try {
      const url = await resolveUrl(item);
      togglePicked(item, url);
    } finally {
      setPicking(null);
    }
  }

  async function commitMulti() {
    const arr = Object.values(selected);
    if (arr.length === 0) return;
    (onPick as (items: PickedItem[]) => void)(arr);
    setOpen(false);
    setSelected({});
  }

  async function quickUpload(file: File) {
    setError(null);
    try {
      const intentRes = await fetch("/api/media/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          filename: file.name,
          mime: file.type || "application/octet-stream",
          size: file.size,
        }),
      });
      if (!intentRes.ok) {
        const j = await intentRes.json().catch(() => ({}));
        setError(j?.error ?? `intent ${intentRes.status}`);
        return;
      }
      const intent = (await intentRes.json()) as UploadIntent;

      const putRes = await fetch(intent.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!putRes.ok && putRes.status !== 200) {
        setError(`storage PUT ${putRes.status}`);
        return;
      }

      // refresh list
      const qp = new URLSearchParams({ limit: "60" });
      if (kind !== "all") qp.set("kind", kind);
      const r = await fetch(`/api/media/list?${qp.toString()}`, {
        credentials: "include",
      });
      if (r.ok) {
        const body = (await r.json()) as MediaListResponse;
        setItems(body.rows);
      }
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const multiCount = Object.keys(selected).length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-mono uppercase tracking-[0.18em] border-b hairline-strong pb-1"
      >
        {label}
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Media picker"
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50"
          onClick={() => {
            if (multi && multiCount > 0) {
              commitMulti();
            } else {
              setOpen(false);
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-canvas border hairline rounded-[var(--radius-card)] w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden"
          >
            <header className="flex items-center justify-between p-4 border-b hairline">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em]">
                {multi ? `Media library Â· multi-select` : "Media library"}
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs font-mono uppercase tracking-[0.18em]"
              >
                Close
              </button>
            </header>
            <div className="flex flex-wrap items-center gap-3 p-4 border-b hairline">
              <select
                className="input-line py-2 text-xs font-mono uppercase tracking-[0.18em]"
                value={kind}
                onChange={(e) => setKind(e.target.value as MediaKind | "all")}
                aria-label="Kind filter"
              >
                <option value="all">All</option>
                {(["image", "glb", "video", "pdf", "raw"] as const).map(
                  (k) => (
                    <option key={k} value={k}>
                      {MEDIATYPE_LABEL[k]}
                    </option>
                  )
                )}
              </select>
              <span className="text-ink-mute text-xs">
                {kind !== "all"
                  ? `Max ${formatBytes(MAX_BYTES[kind])}`
                  : "Any"}
              </span>
              <div className="ml-auto flex items-center gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  hidden
                  accept={
                    accept === "image"
                      ? "image/*"
                      : accept === "glb"
                      ? ".glb,.gltf"
                      : "image/*,video/*,application/pdf,.glb,.gltf"
                  }
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void quickUpload(f);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="btn-primary text-xs h-8 px-3"
                >
                  Upload
                </button>
                {multi && (
                  <button
                    type="button"
                    onClick={() => commitMulti()}
                    disabled={multiCount === 0}
                    className="btn-primary text-xs h-8 px-3"
                    aria-label="Use selection"
                  >
                    {multiCount === 0
                      ? "Use"
                      : `Use selection (${multiCount})`}
                  </button>
                )}
              </div>
            </div>
            {error && (
              <p
                role="alert"
                className="px-4 py-2 text-xs text-ink border-b hairline"
              >
                {error}
              </p>
            )}
            <div className="overflow-y-auto p-4 flex-1">
              {loading && (
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  Loading
                </p>
              )}
              {!loading && items.length === 0 && (
                <p className="text-sm text-ink-mute">
                  No assets yet in this view.
                </p>
              )}
              <ul className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {items.map((m) => {
                  const disabled = picking !== null;
                  const isSelected = !!selected[m.id];
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() =>
                          multi ? void pickMulti(m) : void pickSingle(m)
                        }
                        disabled={disabled}
                        aria-pressed={multi ? isSelected : undefined}
                        className={
                          "w-full text-left border rounded-[var(--radius-control)] overflow-hidden transition-colors " +
                          (isSelected
                            ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30 bg-[var(--surface)]"
                            : "hairline hover:bg-[var(--surface)] ")
                        }
                      >
                        <div className="aspect-[16/10] overflow-hidden bg-elev relative">
                          {multi && (
                            <span
                              aria-hidden
                              className="absolute top-1 left-1 z-10 w-5 h-5 rounded-sm border-2 flex items-center justify-center text-[11px] font-mono"
                              style={{
                                background: isSelected
                                  ? "var(--accent)"
                                  : "rgba(0,0,0,0.4)",
                                color: "var(--bg)",
                                borderColor: isSelected
                                  ? "var(--accent)"
                                  : "rgba(255,255,255,0.5)",
                              }}
                            >
                              {isSelected ? "X" : ""}
                            </span>
                          )}
                          {m.kind === "image" && m.url && (
                            <img
                              src={m.url}
                              alt=""
                              className="absolute inset-0 w-full h-full object-cover"
                              loading="lazy"
                              aria-hidden="true"
                            />
                          )}
                          {m.kind === "glb" && (
                            <div className="absolute inset-0 flex items-center justify-center text-xs font-mono uppercase tracking-[0.18em] text-ink-mute">
                              {m.mime || "glb"}
                            </div>
                          )}
                          {m.kind === "video" && m.url && (
                            <video
                              src={m.url}
                              muted
                              playsInline
                              preload="metadata"
                              className="absolute inset-0 w-full h-full object-cover"
                              aria-hidden="true"
                            />
                          )}
                          {m.kind === "pdf" && (
                            <div className="absolute inset-0 flex items-center justify-center text-xs font-mono uppercase tracking-[0.18em] text-ink-mute">
                              PDF
                            </div>
                          )}
                          {m.kind === "raw" && (
                            <div className="absolute inset-0 flex items-center justify-center text-xs font-mono uppercase tracking-[0.18em] text-ink-mute">
                              {m.mime || "raw"}
                            </div>
                          )}
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-medium truncate">
                            {m.alt || m.original_name}
                          </p>
                          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute mt-1 truncate">
                            {m.mime} Â· {formatBytes(m.size)}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
