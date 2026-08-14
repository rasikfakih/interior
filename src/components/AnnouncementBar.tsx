"use client";

import { useEffect, useState } from "react";

type Announcement = {
  id: number;
  title: string;
  body: string;
  created_at: string;
};

/**
 * Phase 5: platform announcements. Renders the newest active
 * announcement on public pages as a dismissible strip. Dismissals
 * are remembered in a cookie so a buyer only hides a notice once.
 * Audience filtering happens server-side; this component only
 * renders what /api/announcements returns.
 */
export default function AnnouncementBar() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/announcements", { cache: "no-store" });
        if (!r.ok) return;
        const j = (await r.json()) as { items?: Announcement[] };
        if (cancelled) return;
        const list = Array.isArray(j.items) ? j.items : [];
        const hid: Record<number, boolean> = {};
        for (const it of list) {
          if (document.cookie.includes(`announcement_dismiss=${it.id}`)) {
            hid[it.id] = true;
          }
        }
        setItems(list.filter((it) => !hid[it.id]).slice(0, 1));
      } catch {
        /* announcement bar is non-critical - never break the page */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (gone || items.length === 0) return null;
  const it = items[0];

  function dismiss() {
    document.cookie = `announcement_dismiss=${it.id}; path=/; max-age=31536000; samesite=lax`;
    setGone(true);
  }

  return (
    <div className="relative z-50 border-b border-zinc-800 bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-6 py-2.5">
        <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.22em] text-amber-400 sm:block">
          {it.title}
        </span>
        <p className="flex-1 truncate text-sm text-zinc-300" title={it.body}>
          {it.body}
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="shrink-0 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-400 transition-colors hover:text-zinc-100"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
