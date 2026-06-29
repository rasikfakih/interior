"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import GLBThumb from "@/components/admin/GLBThumb";
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

const KIND_FILTERS: Array<{ key: "all" | MediaKind; label: string }> = [
  { key: "all", label: "All" },
  { key: "image", label: "Images" },
  { key: "glb", label: "3D models" },
  { key: "video", label: "Video" },
  { key: "pdf", label: "PDF" },
  { key: "raw", label: "Raw" },
];

export default function MediaGrid() {
  const [items, setItems] = useState<MediaRow[]>([]);
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [kind, setKind] = useState<"all" | MediaKind>("all");
  const [editing, setEditing] = useState<{ id: number; alt: string } | null>(null);
  const [activeUpload, setActiveUpload] = useState<{ filename: string; size: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadPage = useCallback(
    async (cursor?: number) => {
      const qp = new URLSearchParams({ limit: "48" });
      if (kind !== "all") qp.set("kind", kind);
      if (cursor) qp.set("before", String(cursor));
      try {
        const r = await fetch(`/api/media/list?${qp.toString()}`, {
          credentials: "include",
        });
        if (!r.ok) {
          setActionError(`list failed: ${r.status}`);
          return;
        }
        const body = (await r.json()) as MediaListResponse;
        setItems((prev) => (cursor ? [...prev, ...body.rows] : body.rows));
        setNextBefore(body.nextBefore);
      } catch (e: any) {
        setActionError(`list error: ${e?.message ?? "network"}`);
      }
    },
    [kind]
  );

  useEffect(() => {
    setLoading(true);
    setItems([]);
    setNextBefore(null);
    void (async () => {
      try {
        await loadPage();
      } finally {
        // Always clear the skeleton, even if loadPage hit an exception
        // path the edit mutators did not always cover. Without this the
        // grid sticks on SkeletonGrid forever on the first failed fetch.
        setLoading(false);
      }
    })();
  }, [loadPage]);

  async function load() {
    setLoading(true);
    setItems([]);
    await loadPage();
    setLoading(false);
  }

  async function signedUrlForRow(row: MediaRow): Promise<string | null> {
    if (row.url && /^https?:\/\//.test(row.url)) return row.url;
    const r = await fetch(`/api/media/${row.id}/sign`, {
      credentials: "include",
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { url: string };
    return j.url ?? null;
  }

  async function upload(file: File) {
    setActionError(null);
    setActiveUpload({ filename: file.name, size: file.size });
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
        setActionError(j?.error ?? `upload intent failed: ${intentRes.status}`);
        return;
      }
      const intent = (await intentRes.json()) as UploadIntent;

      const putRes = await fetch(intent.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!putRes.ok && putRes.status !== 200) {
        setActionError(`storage PUT failed: ${putRes.status}`);
        return;
      }

      await load();
    } finally {
      setActiveUpload(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function saveAlt(id: number, alt: string) {
    const r = await fetch(`/api/media/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ alt }),
    });
    if (r.ok) {
      setEditing(null);
      await load();
    } else {
      setActionError(`save alt failed: ${r.status}`);
    }
  }

  async function destroy(id: number) {
    if (!confirm("Delete this asset? Removes the file and DB row.")) return;
    setActionError(null);
    const r = await fetch(`/api/media/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (r.ok) {
      await load();
    } else {
      setActionError(`delete failed: ${r.status}`);
    }
  }

  const totalBytes = useMemo(
    () => items.reduce((sum, m) => sum + (m.size ?? 0), 0),
    [items]
  );

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl tracking-tighter">Media library</h1>
          <p className="text-ink-mute text-sm">
            {items.length} on record, {formatBytes(totalBytes)} total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            hidden
            accept="image/*,video/*,application/pdf,.glb,.gltf"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
            }}
          />
          <button
            type="button"
            className="btn-primary"
            onClick={() => fileRef.current?.click()}
            disabled={Boolean(activeUpload)}
            aria-busy={Boolean(activeUpload)}
          >
            {activeUpload
              ? `Uploading ${activeUpload.filename} (${formatBytes(activeUpload.size)})`
              : "Upload"}
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <span
          id="media-filter-label"
          className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute"
        >
          Filter
        </span>
        <div
          role="radiogroup"
          aria-labelledby="media-filter-label"
          className="flex flex-wrap gap-2"
        >
          {KIND_FILTERS.map((f) => {
            const active = kind === f.key;
            return (
              <button
                key={f.key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setKind(f.key)}
                className={
                  active
                    ? "btn-primary text-xs h-8 px-3"
                    : "btn-ghost text-xs h-8 px-3"
                }
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <PerKindCapNotice kind={kind} />

      {actionError && (
        <div
          role="alert"
          className="border border-[var(--accent-soft)] bg-[var(--accent-soft)]/30 text-ink px-4 py-3 text-sm"
        >
          {actionError}
        </div>
      )}

      {loading ? (
        <SkeletonGrid />
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {items.map((m) => (
              <MediaTile
                key={m.id}
                item={m}
                signedUrlForRow={signedUrlForRow}
                editing={editing}
                setEditing={setEditing}
                saveAlt={saveAlt}
                destroy={destroy}
              />
            ))}
          </ul>
          {nextBefore && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                className="btn-ghost text-xs h-9 px-4"
                onClick={() => void loadPage(nextBefore)}
              >
                Load earlier
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PerKindCapNotice({ kind }: { kind: "all" | MediaKind }) {
  if (kind === "all") return null;
  const cap = MAX_BYTES[kind];
  const capLabel =
    cap >= 1024 * 1024
      ? `${Math.round(cap / (1024 * 1024))} MB`
      : `${Math.round(cap / 1024)} KB`;
  return (
    <p
      role="status"
      className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute"
    >
      {MEDIATYPE_LABEL[kind]} cap: {capLabel}
    </p>
  );
}

function SkeletonGrid() {
  return (
    <ul
      role="status"
      aria-label="Loading media"
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <li key={i} className="surface-tile overflow-hidden">
          <div className="aspect-[16/10] bg-[var(--line)] animate-pulse" />
          <div className="p-3 space-y-2">
            <div className="h-3 w-3/4 bg-[var(--line)] animate-pulse" />
            <div className="h-2 w-1/2 bg-[var(--line)] animate-pulse" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyState() {
  return (
    <div className="surface-tile p-10 text-center space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
        Empty library
      </p>
      <p className="text-ink-mute text-sm">
        Upload your first asset. JPG, PNG, SVG, video, PDF, or GLB.
      </p>
    </div>
  );
}

function MediaTile({
  item,
  signedUrlForRow,
  editing,
  setEditing,
  saveAlt,
  destroy,
}: {
  item: MediaRow;
  signedUrlForRow: (row: MediaRow) => Promise<string | null>;
  editing: { id: number; alt: string } | null;
  setEditing: (e: { id: number; alt: string } | null) => void;
  saveAlt: (id: number, alt: string) => Promise<void>;
  destroy: (id: number) => Promise<void>;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void signedUrlForRow(item).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [item, signedUrlForRow]);

  const kind = item.kind;
  return (
    <li className="surface-tile overflow-hidden flex flex-col">
      <div className="aspect-[16/10] relative bg-elev">
        {kind === "image" && url && (
          <img
            src={url}
            alt={item.alt || item.original_name}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        )}
        {kind === "glb" && (
          <GLBThumb
            modelUrl={url ?? ""}
            posterUrl={null}
            alt={item.alt || item.original_name}
          />
        )}
        {kind === "video" && url && (
          <video
            src={url}
            className="absolute inset-0 w-full h-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
        )}
        {kind === "pdf" && url && (
          <object
            data={url}
            type="application/pdf"
            className="absolute inset-0 w-full h-full"
            aria-label={item.alt || item.original_name}
          >
            <div className="absolute inset-0 flex items-center justify-center text-xs font-mono uppercase tracking-[0.18em] text-ink-mute">
              PDF preview unavailable
            </div>
          </object>
        )}
        {kind === "raw" && (
          <div className="absolute inset-0 flex items-center justify-center text-xs font-mono uppercase tracking-[0.18em] text-ink-mute">
            {item.mime || "raw"}
          </div>
        )}
      </div>
      <div className="p-3 space-y-2 flex-1">
        {editing?.id === item.id ? (
          <label className="block space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              Alt text
            </span>
            <input
              autoFocus
              className="input-line"
              placeholder="Describes the asset for screen readers"
              value={editing.alt}
              onChange={(e) =>
                setEditing({ id: item.id, alt: e.target.value })
              }
            />
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => void saveAlt(item.id, editing.alt)}
                className="text-xs font-mono uppercase tracking-[0.18em] text-accent border-b hairline-strong pb-0.5"
              >
                Save alt
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="text-xs font-mono uppercase tracking-[0.18em] text-ink-mute border-b hairline pb-0.5"
              >
                Cancel
              </button>
            </div>
          </label>
        ) : (
          <>
            <p className="text-xs truncate" title={item.alt || item.original_name}>
              {item.alt || item.original_name}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute truncate">
              {item.mime} Â· {formatBytes(item.size)}
            </p>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() =>
                  setEditing({ id: item.id, alt: item.alt ?? "" })
                }
                className="text-[10px] font-mono uppercase tracking-[0.18em] border-b hairline-strong pb-0.5"
              >
                Alt text
              </button>
              <button
                type="button"
                onClick={() => void destroy(item.id)}
                className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink border-b border-[var(--accent-soft)] pb-0.5"
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </li>
  );
}
