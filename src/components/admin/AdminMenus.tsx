"use client";

import { useState } from "react";
import { IconArrowUp, IconArrowDown } from "../icons";

type MenuItem = {
  id?: number;
  label: string;
  href: string;
  is_button?: boolean;
};

type Toast = { kind: "ok" | "err"; msg: string };

const INPUT_CLS =
  "w-full bg-canvas border hairline rounded-[var(--radius-control)] px-3 py-2 text-sm focus:border-accent focus:outline-none";
const LABEL_CLS = "font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute";

export default function AdminMenus({
  initial,
  role,
}: {
  initial: MenuItem[];
  role: string;
}) {
  const [items, setItems] = useState<MenuItem[]>(initial);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  function showToast(kind: Toast["kind"], msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2600);
  }

  function setField(idx: number, key: keyof MenuItem, value: string | boolean) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));
  }

  function move(idx: number, dir: -1 | 1) {
    setItems((prev) => {
      const next = [...prev];
      const to = idx + dir;
      if (to < 0 || to >= next.length) return prev;
      [next[idx], next[to]] = [next[to], next[idx]];
      return next;
    });
  }

  function remove(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function add() {
    setItems((prev) => [...prev, { label: "", href: "/", is_button: false }]);
  }

  async function save() {
    const cleaned = items
      .map((it) => ({
        label: it.label.trim(),
        href: it.href.trim(),
        is_button: Boolean(it.is_button),
      }))
      .filter((it) => it.label && it.href);
    if (cleaned.length === 0) {
      showToast("err", "At least one nav item with label and href is required.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/menus", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cleaned }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast("err", j.error || `Save failed (${r.status})`);
        return;
      }
      setItems(j.items ?? cleaned);
      showToast("ok", "Navigation saved. The header updates on next load.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-end">
        <div className="md:col-span-8">
          <p className="chrome-pill mb-3 inline-flex">Menus</p>
          <h1 className="text-3xl md:text-5xl tracking-tighter">Primary navigation.</h1>
          <p className="text-ink-mute text-sm mt-2">
            The header renders these in order. Internal links start
            with /, external with http(s). Role:{" "}
            <span className="font-mono text-xs">{role}</span>.
          </p>
        </div>
        <div className="md:col-span-4 flex md:justify-end gap-2">
          <a href="/" className="btn-ghost" target="_blank" rel="noreferrer">
            Open site
          </a>
          <button type="button" onClick={save} className="btn-primary" disabled={busy}>
            {busy ? "Saving..." : "Save menu"}
          </button>
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

      <div className="surface-tile rounded-[var(--radius-card)]">
        <ul className="divide-y hairline">
          {items.map((it, idx) => (
            <li key={idx} className="p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft md:col-span-1">
                #{idx + 1}
              </span>
              <div className="md:col-span-4">
                <label className={LABEL_CLS}>Label</label>
                <input
                  value={it.label}
                  onChange={(e) => setField(idx, "label", e.target.value)}
                  className={INPUT_CLS + " mt-1"}
                  placeholder="Selected work"
                  maxLength={80}
                />
              </div>
              <div className="md:col-span-4">
                <label className={LABEL_CLS}>Href</label>
                <input
                  value={it.href}
                  onChange={(e) => setField(idx, "href", e.target.value)}
                  className={INPUT_CLS + " mt-1 font-mono text-xs"}
                  placeholder="/projects-v2"
                  maxLength={240}
                />
              </div>
              <label className="md:col-span-1 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(it.is_button)}
                  onChange={(e) => setField(idx, "is_button", e.target.checked)}
                  className="accent-[var(--accent)]"
                />
                <span className={LABEL_CLS}>Button</span>
              </label>
              <div className="md:col-span-2 flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="px-2 py-1 border hairline rounded-[var(--radius-control)] text-xs disabled:opacity-30"
                  aria-label="Move up"
                >
                  <IconArrowUp aria-hidden size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={idx === items.length - 1}
                  className="px-2 py-1 border hairline rounded-[var(--radius-control)] text-xs disabled:opacity-30"
                  aria-label="Move down"
                >
                  <IconArrowDown aria-hidden size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="px-2 py-1 border hairline rounded-[var(--radius-control)] text-xs text-red-700"
                  aria-label="Remove item"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="p-4 border-t hairline flex items-center justify-between">
          <p className="text-xs text-ink-mute">{items.length}/12 items</p>
          <button type="button" onClick={add} className="btn-ghost text-xs h-9 px-3">
            Add item
          </button>
        </div>
      </div>

      <p className="text-xs text-ink-mute">
        The desktop header and the mobile drawer render the same list.
        A change here is visible on the public site on the next page
        load (pages render dynamically).
      </p>
    </div>
  );
}
