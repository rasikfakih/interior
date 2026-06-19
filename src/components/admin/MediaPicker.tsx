"use client";

import { useEffect, useRef, useState } from "react";

type MediaItem = {
  id: number;
  kind: string;
  url: string;
  alt: string | null;
  originalName: string;
  size: number;
};

type Props = {
  onPick: (item: MediaItem) => void;
  accept?: "image" | "model" | "all";
  label?: string;
};

export default function MediaPicker({ onPick, accept = "all", label = "Pick asset" }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({
      q,
      kind: accept === "all" ? "all" : accept,
    });
    const r = await fetch(`/api/media?${params}`);
    if (r.ok) setItems(await r.json());
    setLoading(false);
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, q]);

  async function quickUpload(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const mime = file.type;
    if (mime.includes("gltf-binary") || mime.includes(".glb")) {
      fd.append("folder", "models");
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
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-canvas border hairline rounded-[var(--radius-card)] w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden"
          >
            <header className="flex items-center justify-between p-4 border-b hairline">
              <p className="chrome-pill">Media library</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs font-mono uppercase tracking-[0.18em]"
              >
                Close
              </button>
            </header>
            <div className="flex gap-2 p-4 border-b hairline">
              <input
                className="input-line flex-1"
                placeholder="Search by name, alt, url"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="btn-primary"
              >
                Upload
              </button>
              <input
                ref={fileRef}
                type="file"
                hidden
                accept={accept === "image" ? "image/*" : accept === "model" ? ".glb,.gltf" : "image/*,.glb,.gltf"}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) quickUpload(f);
                  if (fileRef.current) fileRef.current.value = "";
                }}
              />
            </div>
            <div className="overflow-y-auto p-4 flex-1">
              {loading && (
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  Loading…
                </p>
              )}
              {!loading && items.length === 0 && (
                <p className="text-sm text-ink-mute">No assets yet. Upload one to get started.</p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {items.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onPick(m);
                      setOpen(false);
                    }}
                    className="text-left border hairline rounded-[var(--radius-control)] overflow-hidden hover:bg-[var(--surface)] transition-colors"
                  >
                    <div className="aspect-[16/10] overflow-hidden bg-elev">
                      {m.kind === "image" ? (
                        <img
                          src={m.url}
                          alt={m.alt || m.originalName}
                          className="absolute inset-0 w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-mono uppercase tracking-[0.18em] text-ink-mute">
                          {m.kind}
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">
                        {m.alt || m.originalName}
                      </p>
                      <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-mute mt-1 truncate">
                        {m.kind} · {Math.round((m.size || 0) / 1024)} KB
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
