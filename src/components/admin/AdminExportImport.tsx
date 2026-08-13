"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ImportTable = { table: string; rows: number };

type ImportResult = {
  ok?: boolean;
  error?: string;
  tables?: ImportTable[];
};

function fmtRows(tables: ImportTable[]): string {
  const total = tables.reduce((s, t) => s + t.rows, 0);
  return `${tables.length} tables · ${total.toLocaleString()} rows`;
}

export default function AdminExportImport() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<{
    format: string;
    version: number;
    exportedAt: string;
    tables: Record<string, unknown[]>;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function downloadExport() {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/export", { credentials: "include" });
      if (!r.ok) throw new Error(`export ${r.status}`);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = r.headers.get("content-disposition") || "";
      const m = cd.match(/filename="?([^";]+)"?/);
      a.download = m?.[1] ?? `etihad-content-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "export failed");
    } finally {
      setBusy(false);
    }
  }

  function parseInput(value: string) {
    setErr(null);
    setResult(null);
    try {
      const j = JSON.parse(value);
      if (
        !j ||
        typeof j !== "object" ||
        j.format !== "etihad-content-export" ||
        typeof j.version !== "number" ||
        !j.tables ||
        typeof j.tables !== "object"
      ) {
        setErr("Not a valid content export file (format etihad-content-export).");
        setParsed(null);
        return;
      }
      setParsed(j);
    } catch {
      setErr("Could not parse JSON.");
      setParsed(null);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => parseInput(String(reader.result ?? ""));
    reader.readAsText(f);
  }

  async function runImport() {
    if (!parsed) return;
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      const r = await fetch("/api/import", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const j: ImportResult = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(j?.error ?? `import ${r.status}`);
      } else {
        setResult(j);
        setText("");
        setParsed(null);
        router.refresh();
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="surface-tile rounded-[var(--radius-card)] p-6">
        <p className="chrome-pill mb-3 inline-flex">Export</p>
        <h2 className="text-xl font-semibold text-ink">Download all content</h2>
        <p className="mt-2 max-w-xl text-sm text-ink-mute">
          Downloads every content table (pages + blocks, projects + rooms,
          journal, testimonials, team, media metadata, settings, menus, forms,
          redirects) as one JSON file — restorable on this site or another
          install via Import.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={downloadExport}
          className="btn-primary mt-4 h-10 px-5 text-xs"
        >
          {busy ? "Exporting…" : "Download export"}
        </button>
      </div>

      <div className="surface-tile rounded-[var(--radius-card)] p-6">
        <p className="chrome-pill mb-3 inline-flex">Import</p>
        <h2 className="text-xl font-semibold text-ink">Restore content</h2>
        <p className="mt-2 max-w-xl text-sm text-ink-mute">
          Paste an export file or pick one from disk. Import{" "}
          <span className="font-semibold text-ink">replaces</span> the content
          of every table present in the file — pages, projects, forms and the
          rest are overwritten, not merged.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onFile}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="btn-ghost h-10 px-4 text-xs"
          >
            Choose file…
          </button>
          <span className="font-mono text-[11px] text-ink-mute">or paste:</span>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              parseInput(e.target.value);
            }}
            placeholder='{"format":"etihad-content-export","version":1,…}'
            rows={6}
            className="w-full bg-canvas border hairline rounded-[var(--radius-control)] p-3 font-mono text-xs text-ink focus:border-[var(--accent-deep)] focus:outline-none"
          />
        </div>
        {parsed && (
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-mute">
              {parsed.format} v{parsed.version} · exported {parsed.exportedAt} ·{" "}
              {fmtRows(
                Object.entries(parsed.tables).map(([table, rows]) => ({
                  table,
                  rows: Array.isArray(rows) ? rows.length : 0,
                }))
              )}
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={runImport}
              className="bg-red-900 px-5 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-white hover:bg-red-800 disabled:opacity-50"
            >
              {busy ? "Importing…" : "Import (replaces content)"}
            </button>
          </div>
        )}
        {err && (
          <div
            role="alert"
            className="mt-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {err}
          </div>
        )}
        {result?.ok && result.tables && (
          <div
            role="status"
            className="mt-4 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          >
            Import applied: {fmtRows(result.tables)}.
          </div>
        )}
      </div>
    </div>
  );
}
