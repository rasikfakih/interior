"use client";

import { useEffect, useState } from "react";

type BackupFile = {
  name: string;
  bytes: number;
  mtime: string;
};

type TriggerResult = {
  rows: number;
  bytes: number;
  persisted: string | null;
  generated_at: string;
};

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function BackupBoard() {
  const [items, setItems] = useState<BackupFile[]>([]);
  const [last, setLast] = useState<TriggerResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/operator/backup", { credentials: "include" });
        if (!r.ok) throw new Error(`list ${r.status}`);
        const j = await r.json();
        if (cancelled) return;
        setItems(Array.isArray(j.items) ? j.items : []);
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "list failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function run(download: boolean) {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/operator/backup${download ? "?download=1" : ""}`, {
        method: "POST",
        credentials: "include",
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error ?? `backup ${r.status}`);
      }
      if (download) {
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const cd = r.headers.get("content-disposition") || "";
        const m = cd.match(/filename="?([^";]+)"?/);
        a.download = m?.[1] ?? `backup-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        // Refresh the persisted list (a local write may have landed).
        const lr = await fetch("/api/operator/backup", { credentials: "include" });
        if (lr.ok) {
          const lj = await lr.json();
          setItems(Array.isArray(lj.items) ? lj.items : []);
        }
      } else {
        const j = await r.json();
        setLast({
          rows: j.rows ?? 0,
          bytes: j.bytes ?? 0,
          persisted: j.persisted ?? null,
          generated_at: j.generated_at ?? "",
        });
        if (j.persisted) {
          setItems((prev) => [
            {
              name: j.persisted,
              bytes: j.bytes ?? 0,
              mtime: j.generated_at ?? new Date().toISOString(),
            },
            ...prev.filter((p) => p.name !== j.persisted),
          ]);
        }
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "backup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="op-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink">
              Full-table snapshot
            </h2>
            <p className="mt-1 max-w-xl text-sm text-ink-mute">
              Walks every public table through the shared data layer - works on
              live Postgres and the local SQLite fallback. On serverless, use{" "}
              <span className="font-mono text-xs">Run + download</span> so the
              snapshot comes back in the response (disk is ephemeral there).
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => run(false)}
              className="op-btn-sm"
            >
              {busy ? "Snapshoting…" : "Run backup"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(true)}
              className="btn-primary h-10 px-4 text-[10px]"
            >
              Run + download
            </button>
          </div>
        </div>
        {last && (
          <div className="op-banner op-banner--good mt-4 font-mono text-xs">
            Snapshot {last.generated_at} - {last.rows.toLocaleString()} rows,{" "}
            {fmtBytes(last.bytes)}
            {last.persisted ? ` · persisted as ${last.persisted}` : " · not persisted (serverless)"}
          </div>
        )}
        {err && (
          <div role="alert" className="op-banner op-banner--bad mt-4">
            {err}
          </div>
        )}
      </div>

      <div className="op-panel">
        <div className="op-panel-head">Persisted backups (data/backups/)</div>
        {loading ? (
          <div className="px-4 py-6 text-center text-sm text-ink-mute">Loading…</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-ink-mute">
            No persisted backups yet - run one above (persists when the runtime
            has a writable disk, e.g. self-hosted or local).
          </div>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {items.map((f) => (
              <li
                key={f.name}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate font-mono text-xs text-ink">{f.name}</div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
                    {fmtBytes(f.bytes)} · {f.mtime}
                  </div>
                </div>
                <a
                  href={`/api/operator/backup?download=${encodeURIComponent(f.name)}`}
                  className="op-btn-sm shrink-0"
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
