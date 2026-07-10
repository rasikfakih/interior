"use client";

import { useMemo, useState } from "react";
import type { SettingsKind, WhitelistEntry } from "@/lib/settings-whitelist";

type Row = {
  key: string;
  value: string;
  entry: WhitelistEntry;
};

type Toast = { kind: "ok" | "err"; msg: string };

const INPUT_CLS =
  "w-full bg-canvas border hairline rounded-[var(--radius-control)] px-3 py-2 text-sm font-mono focus:border-accent focus:outline-none";
const LABEL_CLS =
  "font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute";

function FieldInput({
  kind,
  value,
  onChange,
  placeholder,
}: {
  kind: SettingsKind;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  if (kind === "longtext") {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className={INPUT_CLS + " resize-y"}
      />
    );
  }
  return (
    <input
      type={kind === "email" ? "email" : kind === "url" ? "url" : "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={INPUT_CLS}
    />
  );
}

export default function AdminSettings({
  initial,
  role,
}: {
  initial: Row[];
  role: string;
}) {
  const [rows, setRows] = useState<Row[]>(() => initial ?? []);
  const [activeKey, setActiveKey] = useState<string | null>(
    () => (initial?.[0]?.key ?? null) as string | null
  );
  const [draft, setDraft] = useState<string>(() => initial?.[0]?.value ?? "");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [search, setSearch] = useState("");

  const active = useMemo<Row | null>(() => {
    return rows.find((r) => r.key === activeKey) ?? null;
  }, [rows, activeKey]);

  const filtered = useMemo<Row[]>(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.key.toLowerCase().includes(q) ||
        r.entry.label.toLowerCase().includes(q)
    );
  }, [rows, search]);

  function pickKey(key: string) {
    const next = rows.find((r) => r.key === key);
    if (!next) return;
    setActiveKey(key);
    setDraft(next.value);
    setToast(null);
  }

  function showToast(kind: Toast["kind"], msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2400);
  }

  async function save() {
    if (!active) return;
    setBusy(true);
    try {
      const r = await fetch(
        `/api/settings/${encodeURIComponent(active.key)}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: draft }),
        }
      );
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast("err", j.error || `Save failed (${r.status})`);
        return;
      }
      showToast("ok", `Saved ${active.key}`);
      setRows((prev) =>
        prev.map((row) =>
          row.key === active.key ? { ...row, value: draft } : row
        )
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!active) return;
    if (typeof window !== "undefined") {
      const ok = window.confirm(
        `Remove settings key "${active.key}"? Public pages will fall back to the seed default.`
      );
      if (!ok) return;
    }
    setBusy(true);
    try {
      const r = await fetch(
        `/api/settings/${encodeURIComponent(active.key)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        showToast("err", j.error || `Remove failed (${r.status})`);
        return;
      }
      // Locally remove and pick the next row.
      const next = rows.filter((row) => row.key !== active.key);
      setRows(next);
      const follow = next[0]?.key ?? null;
      setActiveKey(follow);
      setDraft(next[0]?.value ?? "");
      showToast("ok", `Removed ${active.key}`);
    } finally {
      setBusy(false);
    }
  }

  function resetFromSeed() {
    if (!active) return;
    setDraft("");
    showToast("ok", `Reset ${active.key} to blank - hit Save to write.`);
  }

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-end">
        <div className="md:col-span-8">
          <p className="chrome-pill mb-3 inline-flex">Settings</p>
          <h1 className="text-3xl md:text-5xl tracking-tighter">
            Site & contact.
          </h1>
          <p className="text-ink-mute text-sm mt-2">
            Whitelisted keys editable here. Each write emits an audit
            entry on <span className="font-mono text-xs">/api/operator/audit</span>.
            Role: <span className="font-mono text-xs">{role}</span>.
          </p>
        </div>
        <div className="md:col-span-4 flex md:justify-end">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            {rows.length} whitelisted keys
          </span>
        </div>
      </header>

      {toast && (
        <div
          role="status"
          className={`surface-elevated px-4 py-3 text-sm rounded-[var(--radius-card)] ${
            toast.kind === "err" ? "text-red-700" : "text-accent"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10">
        {/* Left pane: key index */}
        <aside className="md:col-span-4">
          <div className="surface-tile p-4 rounded-[var(--radius-card)]">
            <div className="mb-3">
              <label className={LABEL_CLS}>Search keys</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="contact_email - studio_address"
                className={INPUT_CLS + " mt-1"}
              />
            </div>
            <ul className="divide-y hairline">
              {filtered.length === 0 && (
                <li className="py-4 text-sm text-ink-mute">No keys match.</li>
              )}
              {filtered.map((row) => {
                const isActive = row.key === activeKey;
                return (
                  <li key={row.key}>
                    <button
                      type="button"
                      onClick={() => pickKey(row.key)}
                      className={`w-full text-left py-3 px-2 -mx-2 rounded-[var(--radius-control)] ${
                        isActive ? "bg-canvas border hairline" : ""
                      }`}
                    >
                      <p className={LABEL_CLS}>{row.entry.label}</p>
                      <p className="font-mono text-xs mt-1 text-ink truncate">
                        {row.key}
                      </p>
                      <p className="text-sm mt-1 truncate">
                        {row.value || (
                          <span className="text-ink-mute">empty - default</span>
                        )}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 pt-4 border-t hairline">
              <p className={LABEL_CLS}>Add new key</p>
              <p className="text-xs text-ink-mute mt-1">
                Hybrid surface ready but inert: no whitelist entries
                carry <span className="font-mono">allowNew</span> today.
                Owner must add a new SETTINGS_WHITELIST entry first.
              </p>
            </div>
          </div>
        </aside>

        {/* Right pane: editor */}
        <main className="md:col-span-8">
          {active ? (
            <div className="surface-tile p-6 rounded-[var(--radius-card)] space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={LABEL_CLS}>{active.entry.label}</p>
                  <p className="font-mono text-base mt-1">{active.key}</p>
                  <p className="text-xs text-ink-mute mt-1">
                    {active.entry.description}
                  </p>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  {active.entry.kind}
                </span>
              </div>
              <FieldInput
                kind={active.entry.kind}
                value={draft}
                onChange={setDraft}
                placeholder={active.entry.placeholder}
              />
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  {draft.length}/2000
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={resetFromSeed}
                    className="btn-ghost"
                    disabled={busy || !draft}
                  >
                    Reset to blank
                  </button>
                  <button
                    type="button"
                    onClick={remove}
                    className="btn-ghost"
                    disabled={busy}
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={save}
                    className="btn-primary"
                    disabled={busy}
                  >
                    {busy ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="surface-tile p-6 rounded-[var(--radius-card)]">
              <p className={LABEL_CLS}>No key selected</p>
              <p className="text-sm text-ink-mute mt-2">
                Pick a key from the left to edit its value.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
