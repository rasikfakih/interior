"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProposalBuilder from "./ProposalBuilder";
import PlanLimitModal from "./PlanLimitModal";
import {
  clientProjectStatusLabel,
  formatRupees,
  relativeTime,
  shortDate,
  type ClientProjectDto,
} from "@/lib/proposals";
import { boardStatusLabel } from "@/lib/boards";
import { boqStatusLabel } from "@/lib/boq";

type Toast = { kind: "ok" | "err"; msg: string };

const INPUT_CLS =
  "w-full bg-canvas border hairline rounded-[var(--radius-control)] px-3 py-2 text-sm focus:border-[var(--accent-deep)] focus:outline-none";

const LABEL_CLS =
  "block font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a] mb-2";

type Tab = "overview" | "proposal" | "boards" | "boq" | "diary" | "portal";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "proposal", label: "Proposal" },
  { key: "boards", label: "Boards" },
  { key: "boq", label: "BOQ" },
  { key: "diary", label: "Diary" },
  { key: "portal", label: "Portal" },
];

export default function ClientProjectDetail({
  projectId,
  initial,
  leadId,
  leadName,
  role,
}: {
  projectId: string;
  initial: Record<string, unknown> | null;
  leadId: string | null;
  leadName: string | null;
  role: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [toast, setToast] = useState<Toast | null>(null);

  function showToast(kind: Toast["kind"], msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2400);
  }

  if (projectId === "new") {
    return (
      <CreateProjectForm
        leadId={leadId}
        leadName={leadName}
        role={role}
        showToast={showToast}
        onCreated={(id) => router.push(`/admin/client-projects/${id}`)}
      />
    );
  }

  const project: ClientProjectDto | null = initial
    ? {
        id: String(initial.id),
        tenantId: Number(initial.tenant_id ?? 0),
        leadId: initial.lead_id == null ? null : Number(initial.lead_id),
        name: String(initial.name ?? ""),
        clientName: initial.client_name == null ? null : String(initial.client_name),
        clientPhone: initial.client_phone == null ? null : String(initial.client_phone),
        clientEmail: initial.client_email == null ? null : String(initial.client_email),
        status: String(initial.status ?? "draft"),
        budget: initial.budget == null ? null : Number(initial.budget),
        areaSqft: initial.area_sqft == null ? null : Number(initial.area_sqft),
        address: initial.address == null ? null : String(initial.address),
        portalToken: initial.portal_token == null ? null : String(initial.portal_token),
        createdAt: initial.created_at == null ? null : String(initial.created_at),
        leadName:
          initial.lead_name == null
            ? null
            : initial.lead_name === ""
              ? null
              : String(initial.lead_name),
      }
    : null;

  if (!project) {
    return <p className="text-ink-mute">Project not found.</p>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="chrome-pill mb-3 inline-flex">Client engagement</p>
          <h1 className="text-3xl md:text-5xl tracking-tighter">{project.name}.</h1>
          {project.clientName && (
            <p className="font-display text-lg text-ink-mute mt-1">
              Prepared for {project.clientName}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex rounded-[var(--radius-control)] border border-[var(--accent)] bg-[var(--accent-soft)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-accent-deep">
            {clientProjectStatusLabel(project.status)}
          </span>
          <span className="font-mono text-sm text-[#c0964f]">
            {formatRupees(project.budget)}
          </span>
        </div>
      </header>

      {toast && (
        <div
          role="status"
          className="surface-elevated px-4 py-3 text-sm rounded-[var(--radius-card)] text-accent-deep"
        >
          {toast.msg}
        </div>
      )}

      <div
        role="tablist"
        aria-label="Project views"
        className="flex gap-1 border-b hairline"
      >
        {TABS.map((t) => (
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

      {tab === "overview" && <OverviewPanel project={project} />}
      {tab === "proposal" && (
        <div className="pt-2">
          <ProposalBuilder projectId={project.id} role={role} />
        </div>
      )}
      {tab === "boards" && (
        <div className="pt-2">
          <BoardsTab projectId={project.id} />
        </div>
      )}
      {tab === "boq" && (
        <div className="pt-2">
          <BOQTab projectId={project.id} />
        </div>
      )}
      {tab === "diary" && (
        <div className="pt-2">
          <DiaryTab projectId={project.id} />
        </div>
      )}
      {tab === "portal" && (
        <div className="pt-2">
          <PortalTab projectId={project.id} />
        </div>
      )}
    </div>
  );
}

function OverviewPanel({ project }: { project: ClientProjectDto }) {
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Client name", value: project.clientName || "-" },
    { label: "Phone", value: project.clientPhone || "-" },
    { label: "Email", value: project.clientEmail || "-" },
    { label: "Budget", value: <span className="font-mono text-[#c0964f]">{formatRupees(project.budget)}</span> },
    { label: "Area", value: project.areaSqft ? `${Math.round(project.areaSqft)} sqft` : "-" },
    { label: "Address", value: project.address || "-" },
    {
      label: "Linked lead",
      value: project.leadId ? (
        <Link
          href={`/admin/leads?q=${encodeURIComponent(project.leadName ?? "")}`}
          className="text-accent-deep hover:underline font-mono text-xs"
        >
          {project.leadName || `Lead #${project.leadId}`}
        </Link>
      ) : (
        "-"
      ),
    },
    { label: "Created", value: shortDate(project.createdAt) },
  ];
  return (
    <div className="surface-tile rounded-[var(--radius-card)] p-6">
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
        {rows.map((r) => (
          <div key={r.label}>
            <dt className={LABEL_CLS}>{r.label}</dt>
            <dd className="text-sm">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function CreateProjectForm({
  leadId,
  leadName,
  role,
  showToast,
  onCreated,
}: {
  leadId: string | null;
  leadName: string | null;
  role: string;
  showToast: (k: Toast["kind"], m: string) => void;
  onCreated: (id: string) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    clientName: leadName ?? "",
    clientPhone: "",
    clientEmail: "",
    budget: "",
    areaSqft: "",
    address: "",
  });
  const [busy, setBusy] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast("err", "A project name is required.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/client-projects", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          lead_id: leadId ? Number(leadId) : undefined,
          budget: form.budget ? Number(form.budget) : null,
          area_sqft: form.areaSqft ? Number(form.areaSqft) : null,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 402 && j?.code === "PLAN_LIMIT") {
          setPlanError(String(j.error ?? "Plan limit reached."));
          return;
        }
        showToast("err", j.error || `Create failed (${r.status})`);
        return;
      }
      showToast("ok", "Project created.");
      onCreated(j.project?.id);
    } catch {
      showToast("err", "Network problem. Create not saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="chrome-pill mb-3 inline-flex">Client engagement</p>
        <h1 className="text-3xl md:text-5xl tracking-tighter">New project.</h1>
        <p className="text-ink-mute text-sm mt-2">
          {leadName
            ? `From lead: ${leadName}. The lead moves to Qualified on create.`
            : "Create an engagement from scratch. Attaching a lead moves it to Qualified."}{" "}
          Role: <span className="font-mono text-xs">{role}</span>.
        </p>
      </header>

      <form onSubmit={onSubmit} className="surface-tile rounded-[var(--radius-card)] p-6 space-y-5 max-w-2xl">
        <div>
          <label className={LABEL_CLS}>Project name</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Desai family home"
            className={INPUT_CLS}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={LABEL_CLS}>Client name</label>
            <input
              value={form.clientName}
              onChange={(e) => setForm({ ...form, clientName: e.target.value })}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Client phone</label>
            <input
              value={form.clientPhone}
              onChange={(e) => setForm({ ...form, clientPhone: e.target.value })}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Client email</label>
            <input
              type="email"
              value={form.clientEmail}
              onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
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
            <label className={LABEL_CLS}>Area (sqft)</label>
            <input
              type="number"
              min={0}
              value={form.areaSqft}
              onChange={(e) => setForm({ ...form, areaSqft: e.target.value })}
              placeholder="1450"
              className={INPUT_CLS + " font-mono"}
            />
          </div>
        </div>
        <div>
          <label className={LABEL_CLS}>Address</label>
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Site address"
            className={INPUT_CLS}
          />
        </div>
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "Creating..." : "Create project"}
        </button>
      </form>
      <PlanLimitModal reason={planError} onClose={() => setPlanError(null)} />
    </div>
  );
}

/** Live boards list for the engagement's Boards tab. */
function BoardsTab({ projectId }: { projectId: string }) {
  const [boards, setBoards] = useState<{ id: string; title: string; status: string; itemsCount?: number }[] | null>(null);

  useEffect(() => {
    void fetch(`/api/boards?client_project_id=${encodeURIComponent(projectId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setBoards(d?.boards ?? []));
  }, [projectId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="chrome-pill inline-flex">Boards</p>
        <Link
          href={`/admin/client-projects/${projectId}/boards`}
          className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent-deep hover:underline"
        >
          Open board studio
        </Link>
      </div>
      {boards === null ? (
        <p className="text-sm text-ink-mute">Loading boards...</p>
      ) : boards.length === 0 ? (
        <div className="surface-tile rounded-[var(--radius-card)] p-6">
          <p className="text-ink-mute text-sm">
            No moodboards yet. Create one in the board studio and start
            dragging materials from your library onto the canvas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {boards.map((b) => (
            <Link
              key={b.id}
              href={`/admin/client-projects/${projectId}/boards/${b.id}`}
              className="surface-tile rounded-[var(--radius-card)] p-4 flex items-center justify-between gap-3 hover:border-[#c0964f] transition-colors"
            >
              <div>
                <p className="font-display text-base">{b.title}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#56605a] mt-0.5">
                  {b.itemsCount ?? 0} items
                </p>
              </div>
              <span className="inline-flex rounded-[var(--radius-control)] border border-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-accent-deep">
                {boardStatusLabel(b.status)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/** Live diary summary for the engagement's Diary tab. */
function DiaryTab({ projectId }: { projectId: string }) {
  const [logCount, setLogCount] = useState<number | null>(null);
  const [openSnags, setOpenSnags] = useState<number | null>(null);

  useEffect(() => {
    void fetch(`/api/site-logs?client_project_id=${encodeURIComponent(projectId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setLogCount(Array.isArray(d?.logs) ? d.logs.length : 0));
    void fetch(`/api/snags?client_project_id=${encodeURIComponent(projectId)}&status=open`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setOpenSnags(Array.isArray(d?.snags) ? d.snags.length : 0));
  }, [projectId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="chrome-pill inline-flex">Diary</p>
        <Link
          href={`/admin/client-projects/${projectId}/diary`}
          className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent-deep hover:underline"
        >
          Open site diary
        </Link>
      </div>
      {logCount === null ? (
        <p className="text-sm text-ink-mute">Loading diary...</p>
      ) : logCount === 0 && openSnags === 0 ? (
        <div className="surface-tile rounded-[var(--radius-card)] p-6">
          <p className="text-ink-mute text-sm">
            No site logs yet. The diary works offline - add today&apos;s
            entry from the site, and snags raised there show up here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="surface-tile rounded-[var(--radius-card)] p-4">
            <p className="block font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a] mb-2">
              Site logs
            </p>
            <p className="font-mono text-2xl">{logCount}</p>
          </div>
          <div className="surface-tile rounded-[var(--radius-card)] p-4">
            <p className="block font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a] mb-2">
              Open snags
            </p>
            <p className="font-mono text-2xl">{openSnags ?? 0}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Client portal entry for the engagement's Portal tab. */
function PortalTab({ projectId }: { projectId: string }) {
  const [token, setToken] = useState<{ token: string | null; access: number } | null>(null);

  useEffect(() => {
    void fetch(`/api/client-projects/${projectId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) =>
        setToken({
          token: d?.project?.portal_token ?? null,
          access: Number(d?.project?.portal_access_count ?? 0),
        })
      );
  }, [projectId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="chrome-pill inline-flex">Client portal</p>
        <Link
          href={`/admin/client-projects/${projectId}/portal`}
          className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent-deep hover:underline"
        >
          {token?.token ? "Open portal settings" : "Create portal link"}
        </Link>
      </div>
      {token === null ? (
        <p className="text-sm text-ink-mute">Loading portal...</p>
      ) : (
        <div className="surface-tile rounded-[var(--radius-card)] p-6">
          {token.token ? (
            <>
              <p className="text-ink-mute text-sm">
                A share link exists for this project. Your client sees the
                boards, BOQ, site diary and snags without logging in.
              </p>
              <p className="font-mono text-xs text-[#56605a] mt-3">
                Accessed {token.access} time{token.access === 1 ? "" : "s"}.
              </p>
            </>
          ) : (
            <p className="text-ink-mute text-sm">
              No portal link yet. Generate one to share boards, the BOQ,
              site photos and snags with your client on a private link.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Live BOQ version list for the engagement's BOQ tab. */
function BOQTab({ projectId }: { projectId: string }) {
  const [versions, setVersions] = useState<
    { id: string; title: string; status: string; total: number; itemsCount?: number }[] | null
  >(null);

  useEffect(() => {
    void fetch(`/api/boq?client_project_id=${encodeURIComponent(projectId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setVersions(d?.versions ?? []));
  }, [projectId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="chrome-pill inline-flex">BOQ</p>
        <Link
          href={`/admin/client-projects/${projectId}/boq`}
          className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent-deep hover:underline"
        >
          Open BOQ engine
        </Link>
      </div>
      {versions === null ? (
        <p className="text-sm text-ink-mute">Loading versions...</p>
      ) : versions.length === 0 ? (
        <div className="surface-tile rounded-[var(--radius-card)] p-6">
          <p className="text-ink-mute text-sm">
            No BOQ versions yet. Generate a draft from a standard template in
            the BOQ engine - linked materials pull live costs from your library.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {versions.map((v) => (
            <Link
              key={v.id}
              href={`/admin/client-projects/${projectId}/boq?v=${v.id}`}
              className="surface-tile rounded-[var(--radius-card)] p-4 flex items-center justify-between gap-3 hover:border-[#c0964f] transition-colors"
            >
              <div>
                <p className="font-display text-base">{v.title}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#56605a] mt-0.5">
                  {v.itemsCount ?? 0} items
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-[#c0964f]">
                  {formatRupees(v.total)}
                </span>
                <span className="inline-flex rounded-[var(--radius-control)] border border-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-accent-deep">
                  {boqStatusLabel(v.status)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
