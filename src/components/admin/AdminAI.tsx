"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { GenerationDto } from "@/lib/ai";
import { shortDate } from "@/lib/proposals";

type Credits = { aiCredits: number; aiCreditsUsed: number };

const TYPE_LABEL: Record<string, string> = {
  weekly_report: "Weekly report",
  social_caption: "Social captions",
  proposal_summary: "Proposal summary",
  lead_score: "Lead score",
  budget_insight: "Budget insight",
};

const TYPE_FILTERS = ["", "weekly_report", "social_caption", "proposal_summary", "lead_score", "budget_insight"];

export default function AdminAI() {
  const [credits, setCredits] = useState<Credits | null>(null);
  const [generations, setGenerations] = useState<GenerationDto[] | null>(null);
  const [filter, setFilter] = useState("");

  async function load(type: string) {
    const q = type ? `?type=${encodeURIComponent(type)}` : "";
    try {
      const r = await fetch(`/api/ai/generations${q}`);
      if (!r.ok) return;
      const d = await r.json();
      setCredits(d.credits ?? null);
      setGenerations(Array.isArray(d.generations) ? d.generations : []);
    } catch {
      /* keep state */
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(filter);
  }, [filter]);

  const usedPct = credits && credits.aiCredits > 0
    ? Math.min(100, Math.round((credits.aiCreditsUsed / credits.aiCredits) * 100))
    : 0;

  function preview(g: GenerationDto): string {
    const o = g.output;
    if (o.report) return o.report.split("\n")[0] ?? "";
    if (o.captions?.[0]) return o.captions[0];
    if (o.text) return o.text;
    if (typeof o.score === "number") return `${o.score}/100 - ${o.reason ?? ""}`;
    return "";
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="chrome-pill mb-3 inline-flex">AI &amp; social</p>
        <h1 className="text-3xl md:text-5xl tracking-tighter">Usage.</h1>
        <p className="text-ink-mute text-sm mt-2">
          Every generation is metered and recorded here. The credit budget
          powers Module 10 freemium limits.
        </p>
      </header>

      {/* Credit meter */}
      <div className="surface-tile rounded-[var(--radius-card)] p-6">
        <div className="flex items-baseline justify-between gap-4 mb-3">
          <p className="block font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a]">
            Credit meter
          </p>
          <p className="font-mono text-sm text-[#c0964f]">
            {credits ? `${credits.aiCreditsUsed} / ${credits.aiCredits}` : "..."}
          </p>
        </div>
        <div className="h-2 rounded-full bg-[#d6cbb3]/50 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#c0964f] transition-all"
            style={{ width: `${usedPct}%` }}
          />
        </div>
        {credits && credits.aiCreditsUsed >= credits.aiCredits && (
          <div className="flex items-center justify-between gap-3 mt-3">
            <p className="text-sm text-[#8a2f2f]">
              Credits exhausted. Add more in your plan before the next generation.
            </p>
            <Link
              href="/admin/billing"
              className="shrink-0 rounded-lg bg-[#122A20] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[#ECECE6] hover:opacity-90"
            >
              Upgrade plan
            </Link>
          </div>
        )}
      </div>

      {/* Ledger */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="chrome-pill inline-flex">Generations</p>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-canvas border hairline rounded-[var(--radius-control)] px-3 py-1.5 font-mono text-xs text-ink-mute"
            aria-label="Filter by type"
          >
            {TYPE_FILTERS.map((t) => (
              <option key={t || "all"} value={t}>
                {t ? TYPE_LABEL[t] ?? t : "All types"}
              </option>
            ))}
          </select>
        </div>

        {generations === null ? (
          <p className="text-sm text-ink-mute">Loading generations...</p>
        ) : generations.length === 0 ? (
          <div className="surface-tile rounded-[var(--radius-card)] p-8 text-center">
            <p className="text-ink-mute text-sm">
              No generations yet. Generate a weekly report from the site diary
              or captions from a project&apos;s social autopilot.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {generations.map((g) => (
              <div key={g.id} className="surface-tile rounded-[var(--radius-card)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex rounded-md border border-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-accent-deep">
                      {TYPE_LABEL[g.type] ?? g.type}
                    </span>
                    <span className="font-mono text-[10px] text-[#56605a]">{g.model}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-[#56605a]">
                      {g.creditsUsed} credit{g.creditsUsed === 1 ? "" : "s"}
                    </span>
                    <span className="font-mono text-[10px] text-[#56605a]">
                      {g.createdAt ? shortDate(g.createdAt) : ""}
                    </span>
                  </div>
                </div>
                <p className="font-display text-sm leading-relaxed line-clamp-2">
                  {preview(g) || "No text output"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
