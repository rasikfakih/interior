"use client";

import { useState } from "react";
import type { AiOutput, GenerationDto } from "@/lib/ai";
import { IconCheck, IconDownload, IconPlus } from "@/components/icons";
import PlanLimitModal from "./PlanLimitModal";

type Toast = { kind: "ok" | "err"; msg: string };

const SECTION_HEADS = ["Work Completed", "Labour & Materials", "Next Week Plan"];

function splitSections(report: string): { head: string | null; body: string }[] {
  const lines = report.split(/\n+/);
  const out: { head: string | null; body: string }[] = [];
  let current: { head: string | null; body: string } = { head: null, body: "" };
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    const head = SECTION_HEADS.find((h) => t.toLowerCase() === h.toLowerCase());
    if (head) {
      if (current.body || current.head) out.push(current);
      current = { head, body: "" };
    } else {
      current.body = current.body ? `${current.body}\n${t}` : t;
    }
  }
  if (current.body || current.head) out.push(current);
  return out;
}

export default function AdminWeeklyReport({
  projectId,
  onShared,
}: {
  projectId: string;
  onShared?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [generation, setGeneration] = useState<GenerationDto | null>(null);
  const [credits, setCredits] = useState<{ aiCredits: number; aiCreditsUsed: number } | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  function showToast(kind: Toast["kind"], msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2600);
  }

  async function generate() {
    if (busy) return;
    setBusy(true);
    setGeneration(null);
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    try {
      const r = await fetch("/api/ai/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_project_id: projectId,
          type: "weekly_report",
          input: { from, to },
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 402 && j?.code === "PLAN_LIMIT") {
          setPlanError(String(j.error ?? "AI credits exhausted."));
          return;
        }
        showToast("err", j.error || `Generation failed (${r.status})`);
        return;
      }
      setGeneration(j.generation);
      setCredits(j.credits ?? null);
      if (j.mock) showToast("ok", "Draft generated (dev mode, no AI key set).");
      else showToast("ok", "Weekly report generated.");
    } catch {
      showToast("err", "Network problem. Generation not saved.");
    } finally {
      setBusy(false);
    }
  }

  async function copyReport() {
    if (!generation) return;
    const text = generation.output.report || generation.output.text || "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      showToast("err", "Clipboard unavailable.");
    }
  }

  async function shareToPortal() {
    if (!generation || sharing) return;
    setSharing(true);
    const text = generation.output.report || generation.output.text || "";
    try {
      const r = await fetch(`/api/client-projects/${projectId}/portal/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: `Weekly report\n\n${text}` }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast("err", j.error || `Share failed (${r.status})`);
        return;
      }
      showToast("ok", "Report shared to the client portal thread.");
      onShared?.();
    } catch {
      showToast("err", "Network problem. Share not saved.");
    } finally {
      setSharing(false);
    }
  }

  const report = generation?.output.report || generation?.output.text || "";
  const sections = report ? splitSections(report) : [];

  return (
    <section className="surface-tile rounded-[var(--radius-card)] p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="chrome-pill inline-flex">AI weekly report</p>
          <p className="text-sm text-ink-mute mt-1">
            Last 7 days of site logs, summarized by the AI into Work
            Completed, Labour &amp; Materials and Next Week Plan.
          </p>
        </div>
        <button
          onClick={() => void generate()}
          disabled={busy}
          className="btn-primary"
        >
          {busy ? "Writing..." : "Generate weekly report"}
        </button>
      </div>

      {credits && (
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#56605a]">
          Credits: {credits.aiCreditsUsed} / {credits.aiCredits}
        </p>
      )}

      {toast && (
        <p
          role="status"
          className={`text-sm ${toast.kind === "ok" ? "text-accent-deep" : "text-[#8a2f2f]"}`}
        >
          {toast.msg}
        </p>
      )}

      {generation && (
        <div className="space-y-4">
          <div className="rounded-[var(--radius-card)] border hairline bg-[rgba(214,203,179,0.35)] p-5">
            {sections.length > 0 ? (
              <div className="space-y-5">
                {sections.map((s, i) => (
                  <div key={i}>
                    {s.head && (
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a] mb-2">
                        {s.head}
                      </p>
                    )}
                    <p className="font-display text-[15px] leading-relaxed whitespace-pre-line">
                      {s.body}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-display text-[15px] leading-relaxed whitespace-pre-line">{report}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => void copyReport()}
              className="inline-flex items-center gap-1.5 rounded-lg border hairline px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute hover:text-ink"
            >
              {copied ? <IconCheck size={13} /> : null}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border hairline px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute hover:text-ink"
            >
              <IconDownload size={13} />
              Save as PDF
            </button>
            <button
              onClick={() => void shareToPortal()}
              disabled={sharing}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[#ECECE6] bg-[#122A20] hover:opacity-90 disabled:opacity-50"
            >
              <IconPlus size={13} />
              {sharing ? "Sharing..." : "Share to client portal"}
            </button>
            <span className="ml-auto font-mono text-[10px] text-[#56605a]">
              {generation.model}
            </span>
          </div>
        </div>
      )}
      <PlanLimitModal reason={planError} onClose={() => setPlanError(null)} />
    </section>
  );
}

export type { AiOutput };
