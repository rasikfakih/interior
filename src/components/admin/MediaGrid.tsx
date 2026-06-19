"use client";

import { useEffect, useRef, useState } from "react";

type MediaItem = {
  id: number;
  kind: string;
  url: string;
  alt: string | null;
  originalName: string;
  size: number;
  mime: string;
  width: number | null;
  height: number | null;
  createdAt: string | null;
};

const KIND_FILTERS = [
  { key: "all", label: "All" },
  { key: "image", label: "Images" },
  { key: "model", label: "Models" },
  { key: "document", label: "Documents" },
];

export default function MediaGrid() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");
  const [editing, setEditing] = useState<{ id: number; alt: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ q, kind });
    const r = await fetch(`/api/media?${params}`);
    if (r.ok) setItems(await r.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, kind]);

  async function upload(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    if (file.type.includes("gltf-binary") || file.name.endsWith(".glb")) {
      fd.append("folder", "models");
    } else if (file.type === "application/pdf") {
      fd.append("folder", "documents");
    } else {
      fd.append("folder", "images");
    }
    const r = await fetch("/api/media", { method: "POST", body: fd });
    if (!r.ok) {
      const j = await r.json();
      alert(j.error || "Upload failed");
      return;
    }
    await load();
  }

  async function saveAlt(id: number, alt: string) {
    const r = await fetch(`/api/media/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alt }),
    });
    if (r.ok) {
      setEditing(null);
      load();
    }
  }

  async function destroy(id: number) {
    if (!confirm("Delete this asset? Removes the file and DB row.")) return;
    const r = await fetch(`/api/media/${id}`, { method: "DELETE" });
    if (r.ok) load();
    else alert("Delete failed");
  }

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl tracking-tighter">Media library</h2>
          <p className="text-ink-mute text-sm mt-1">{items.length} on record</p>
        </div>
        <button
          className="btn-primary"
          type="button"
          onClick={() => fileRef.current?.click()}
        >
          Upload new
        </button>
        <input
          ref={fileRef}
          type="file"
          hidden
          accept="image/*,.glb,.gltf,application/pdf"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            if (fileRef.current) fileRef.current.value = "";
          }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-8">
          <input
            className="input-line"
            placeholder="Search by name, alt, URL"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="md:col-span-4 flex gap-2 overflow-x-auto">
          {KIND_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setKind(f.key)}
              className={`px-3 py-2 rounded-[var(--radius-control)] text-xs font-mono uppercase tracking-[0.18em] border ${
                kind === f.key ? "hairline-strong bg-canvas" : "hairline"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          Loading…
        </p>
      ) : items.length === 0 ? (
        <div className="surface-tile p-8 text-center">
          <p className="chrome-pill mb-3 inline-flex">Empty</p>
          <p className="text-ink-mute">Upload your first asset to begin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {items.map((m) => (
            <article
              key={m.id}
              className="surface-tile overflow-hidden text-left"
            >
              <div className="aspect-[16/10] relative bg-elev">
                {m.kind === "image" ? (
                  <img
                    src={m.url}
                    alt={m.alt || m.originalName}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                    .{m.kind}
                  </div>
                )}
              </div>
              <div className="p-3 space-y-2">
                {editing?.id === m.id ? (
                  <>
                    <input
                      className="input-line"
                      placeholder="Alt text"
                      value={editing.alt}
                      onChange={(e) =>
                        setEditing({ id: m.id, alt: e.target.value })
                      }
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveAlt(m.id, editing.alt)}
                        className="text-xs font-mono uppercase tracking-[0.18em] text-accent"
                      >
                        Save alt
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="text-xs font-mono uppercase tracking-[0.18em] text-ink-mute"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-xs truncate" title={m.alt || m.originalName}>
                    {m.alt || m.originalName}
                  </p>
                )}
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-mute truncate">
                  {m.kind} · {Math.round((m.size || 0) / 1024)} KB
                </p>
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditing({ id: m.id, alt: m.alt || "" })}
                    className="text-[10px] font-mono uppercase tracking-[0.18em] border-b hairline-strong pb-0.5"
                  >
                    Alt text
                  </button>
                  <button
                    type="button"
                    onClick={() => destroy(m.id)}
                    className="text-[10px] font-mono uppercase tracking-[0.18em] text-warm border-b border-[var(--accent-warm-soft)] pb-0.5"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
