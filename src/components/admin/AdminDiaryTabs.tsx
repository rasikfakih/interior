"use client";

import { useState } from "react";
import AdminDiary from "./AdminDiary";
import AdminSnags from "./AdminSnags";

type Tab = "diary" | "snags";

/** Diary | Snags tab strip for the site diary page. */
export default function AdminDiaryTabs({
  projectId,
  role,
}: {
  projectId: string;
  role: string;
}) {
  const [tab, setTab] = useState<Tab>("diary");

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Site views"
        className="flex gap-1 border-b hairline"
      >
        {(
          [
            { key: "diary", label: "Diary" },
            { key: "snags", label: "Snags" },
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] -mb-px border-b-2 transition-colors ${
              tab === t.key
                ? "border-[#c0964f] text-ink"
                : "border-transparent text-ink-mute hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "diary" ? (
        <AdminDiary projectId={projectId} role={role} />
      ) : (
        <AdminSnags projectId={projectId} role={role} />
      )}
    </div>
  );
}
