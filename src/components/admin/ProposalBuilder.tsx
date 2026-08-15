"use client";

import { useEffect, useState } from "react";
import {
  proposalStatusLabel,
  formatRupees,
  relativeTime,
  shortDate,
  type ProposalDto,
} from "@/lib/proposals";

type Toast = { kind: "ok" | "err"; msg: string };

const INPUT_CLS =
  "w-full bg-canvas border hairline rounded-[var(--radius-control)] px-3 py-2 text-sm focus:border-[var(--accent-deep)] focus:outline-none";

const LABEL_CLS =
  "block font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a] mb-2";

export default function ProposalBuilder({
  projectId,
  role,
}: {
  projectId: string;
  role: string;
}) {
  const [form, setForm] = useState({
    title: "Project Proposal",
    budget: "",
    timeline: "",
    scope: "",
    terms: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [generated, setGenerated] = useState<{
    url: string;
    token: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [proposals, setProposals] = useState<ProposalDto[]>([]);
  const [boards, setBoards] = useState<{ id: string; title: string; status: string }[]>([]);
  const [selectedBoardIds, setSelectedBoardIds] = useState<string[]>([]);
  const [boqVersions, setBoqVersions] = useState<{ id: string; title: string; total: number }[]>([]);
  const [selectedBoqVersion, setSelectedBoqVersion] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  function showToast(kind: Toast["kind"], msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2400);
  }

  async function loadHistory() {
    const r = await fetch(`/api/proposals?project_id=${encodeURIComponent(projectId)}`, {
      credentials: "include",
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok) setProposals(j.proposals ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHistory();
    void fetch(`/api/boards?client_project_id=${encodeURIComponent(projectId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setBoards(d?.boards ?? []))
      .catch(() => {});
    void fetch(`/api/boq?client_project_id=${encodeURIComponent(projectId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const list = d?.versions ?? [];
        setBoqVersions(list);
        if (list.length > 0) setSelectedBoqVersion(list[0].id);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const scope = form.scope
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const r = await fetch("/api/proposals/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          title: form.title.trim() || "Project Proposal",
          budget: form.budget ? Number(form.budget) : null,
          timeline_text: form.timeline.trim() || null,
          content_json: {
            scope,
            terms: form.terms.trim() || undefined,
            notes: form.notes.trim() || undefined,
            boards: selectedBoardIds,
            boq_version_id: selectedBoqVersion || undefined,
          },
          boq_version_id: selectedBoqVersion || null,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast("err", j.error || `Generate failed (${r.status})`);
        return;
      }
      const full = `${window.location.origin}${j.url}`;
      setGenerated({ url: full, token: j.token });
      showToast("ok", "Proposal link generated.");
      loadHistory();
    } catch {
      showToast("err", "Network problem. Link not generated.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      showToast("err", "Could not copy. Select the link manually.");
    }
  }

  const whatsappHref = generated
    ? `https://wa.me/?text=${encodeURIComponent(
        `${form.title.trim() || "Project Proposal"} for ${form.scope ? "your project" : "your home"} - ${generated.url}`
      )}`
    : "#";

  return (
    <div className="space-y-6">
      <header>
        <p className="chrome-pill mb-3 inline-flex">Proposal</p>
        <h2 className="text-2xl md:text-3xl tracking-tighter">
          Build the proposal.
        </h2>
        <p className="text-ink-mute text-sm mt-1">
          Fill the summary, generate a share link, and send it. Every open is
          tracked; the client can accept from the link. Role:{" "}
          <span className="font-mono text-xs">{role}</span>.
        </p>
      </header>

      {toast && (
        <div
          role="status"
          className="surface-elevated px-4 py-3 text-sm rounded-[var(--radius-card)] text-accent-deep"
        >
          {toast.msg}
        </div>
      )}

      <form onSubmit={generate} className="surface-tile rounded-[var(--radius-card)] p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={LABEL_CLS}>Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Budget (INR)</label>
            <input
              type="number"
              min={0}
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
              placeholder="1200000"
              className={INPUT_CLS + " font-mono"}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Timeline</label>
            <input
              value={form.timeline}
              onChange={(e) => setForm({ ...form, timeline: e.target.value })}
              placeholder="24 weeks"
              className={INPUT_CLS + " font-mono"}
            />
          </div>
        </div>
        <div>
          <label className={LABEL_CLS}>Scope (one item per line)</label>
          <textarea
            rows={4}
            value={form.scope}
            onChange={(e) => setForm({ ...form, scope: e.target.value })}
            placeholder={"Living room design\nKitchen + utility remodel\nModular wardrobes"}
            className={INPUT_CLS + " resize-none font-mono text-xs"}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={LABEL_CLS}>Terms</label>
            <textarea
              rows={4}
              value={form.terms}
              onChange={(e) => setForm({ ...form, terms: e.target.value })}
              placeholder="Payment schedule, site visit terms, inclusions..."
              className={INPUT_CLS + " resize-none"}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Notes / next steps</label>
            <textarea
              rows={4}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="We will call to confirm the site visit."
              className={INPUT_CLS + " resize-none"}
            />
          </div>
        </div>
        <div>
          <label className={LABEL_CLS}>Moodboards to include</label>
          {boards.length === 0 ? (
            <p className="text-sm text-ink-mute">
              No moodboards yet. Create one in the Board Studio first; boards
              attached here render inside the proposal.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {boards.map((b) => {
                const checked = selectedBoardIds.includes(b.id);
                return (
                  <button
                    type="button"
                    key={b.id}
                    onClick={() =>
                      setSelectedBoardIds((prev) =>
                        checked ? prev.filter((x) => x !== b.id) : [...prev, b.id]
                      )
                    }
                    className={`inline-flex items-center gap-2 rounded-[var(--radius-control)] border px-3 py-1.5 text-sm transition-colors ${
                      checked
                        ? "border-[#c0964f] bg-[var(--accent-soft)] text-ink"
                        : "border-hairline text-ink-mute hover:text-ink"
                    }`}
                  >
                    <span
                      className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm border text-[9px] ${
                        checked ? "border-[#c0964f] bg-[#c0964f] text-[#122a20]" : "border-[#d6cbb3]"
                      }`}
                    >
                      {checked && (
                        <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden>
                          <path
                            d="M1.5 5.2 4 7.7 8.5 2.3"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    {b.title}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div>
          <label className={LABEL_CLS}>BOQ version</label>
          {boqVersions.length === 0 ? (
            <p className="text-sm text-ink-mute">
              No BOQ versions yet. Generate one in the BOQ engine first; the
              proposal carries its live total.
            </p>
          ) : (
            <select
              value={selectedBoqVersion}
              onChange={(e) => setSelectedBoqVersion(e.target.value)}
              className={INPUT_CLS}
              aria-label="BOQ version"
            >
              {boqVersions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title} · {formatRupees(v.total)}
                </option>
              ))}
            </select>
          )}
        </div>
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "Generating..." : "Generate proposal link"}
        </button>
      </form>

      {generated && (
        <div className="surface-tile rounded-[var(--radius-card)] p-6 space-y-4">
          <p className="chrome-pill inline-flex">Share link</p>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              readOnly
              value={generated.url}
              onFocus={(e) => e.currentTarget.select()}
              className={INPUT_CLS + " font-mono text-xs flex-1"}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => copyLink(generated.url)}
                className="btn-ghost"
              >
                {copied ? "Copied" : "Copy"}
              </button>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
              >
                WhatsApp
              </a>
              <a
                href={`/proposal/${generated.token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                View proposal
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a]">
          Previous proposals ({proposals.length})
        </p>
        {proposals.length === 0 && (
          <p className="text-sm text-ink-mute">
            No proposals yet. Generate the first link above.
          </p>
        )}
        {proposals.map((p) => {
          const url = `${window.location.origin}/proposal/${p.token}`;
          return (
            <div
              key={p.id}
              className="surface-tile rounded-[var(--radius-card)] px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2"
            >
              <div className="min-w-[180px]">
                <p className="font-display text-[15px] font-medium">{p.title}</p>
                <p className="font-mono text-[10px] text-[#56605a]">
                  {shortDate(p.createdAt)}
                </p>
              </div>
              <span className="inline-flex rounded-[var(--radius-control)] border border-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-accent-deep">
                {proposalStatusLabel(p.status)}
              </span>
              <span className="font-mono text-xs text-[#56605a]">
                {formatRupees(p.budget)}
              </span>
              <span className="font-mono text-xs text-[#56605a]" title="Views">
                {p.viewedCount} view{p.viewedCount === 1 ? "" : "s"} ·{" "}
                {p.viewedAt ? `seen ${relativeTime(p.viewedAt)}` : "not seen"}
              </span>
              {p.acceptedAt && (
                <span className="font-mono text-xs text-[#56605a]">
                  accepted {shortDate(p.acceptedAt)}
                  {p.acceptedByName ? ` by ${p.acceptedByName}` : ""}
                </span>
              )}
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => copyLink(url)}
                  className="btn-ghost"
                >
                  Copy link
                </button>
                <a
                  href={`/proposal/${p.token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost"
                >
                  Open
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
