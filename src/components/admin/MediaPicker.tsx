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

type Props = {
  onPick: (item: MediaRow, signedUrl: string | null) => void;
  accept?: "all" | MediaKind;
  label?: string;
};

export default function MediaPicker({
  onPick,
  accept = "all",
  label = "Pick asset",
}: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [kind, setKind] = useState<"all" | MediaKind>(accept);
  const [picking, setPicking] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setKind(accept);
  }, [accept, open]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    const qp = new URLSearchParams({ limit: "60" });
    if (kind !== "all") qp.set("kind", kind);
    fetch(`/api/media/list?${qp.toString()}`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`list ${r.status}`);
        return (await r.json()) as MediaListResponse;
      })
      .then((body) => setItems(body.rows))
      .catch((e: any) => setError(e.message ?? "list failed"))
      .finally(() => setLoading(false));
  }, [kind, open]);

  async function pick(item: MediaRow) {
    setPicking(item.id);
    setError(null);
    try {
      if (item.url && /^https?:\/\//.test(item.url)) {
        onPick(item, item.url);
      } else {
        const r = await fetch(`/api/media/${item.id}/sign`, {
          credentials: "include",
        });
        const j = (await r.json().catch(() => ({}))) as { url?: string };
        onPick(item, j.url ?? null);
      }
      setOpen(false);
    } finally {
      setPicking(null);
    }
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
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-canvas border hairline rounded-[var(--radius-card)] w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden"
          >
            <header className="flex items-center justify-between p-4 border-b hairline">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em]">
                Media library
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
              </div>
            </div>
            {error && (
              <p
                role="alert"
                className="px-4 py-2 text-xs text-warm border-b hairline"
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
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => void pick(m)}
                        disabled={disabled}
                        className="w-full text-left border hairline rounded-[var(--radius-control)] overflow-hidden hover:bg-[var(--surface)] transition-colors"
                      >
                        <div className="aspect-[16/10] overflow-hidden bg-elev relative">
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
                            {m.mime} · {formatBytes(m.size)}
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
