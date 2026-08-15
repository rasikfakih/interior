"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  diaryRelativeTime,
  formatLogDate,
  SNAG_PRIORITIES,
  SNAG_STATUSES,
  snagPriorityLabel,
  snagStatusLabel,
  type SiteLogDto,
  type SnagDto,
} from "@/lib/site-diary";
import {
  IconCamera,
  IconCheckCircle,
  IconPlus,
  IconTrash,
  IconX,
} from "@/components/icons";

type Toast = { kind: "ok" | "err"; msg: string };

const INPUT_CLS =
  "w-full bg-canvas border hairline rounded-[var(--radius-control)] px-3 py-2 text-sm focus:border-[var(--accent-deep)] focus:outline-none";
const LABEL_CLS =
  "block font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a] mb-2";
const DEMO_FALLBACK = "/demo/living-room-1.jpg";

const STATUS_STYLES: Record<string, string> = {
  open: "border-[#c0964f] bg-[var(--accent-soft)] text-accent-deep",
  fixed: "border-[#2e7d52] bg-[rgba(46,125,82,0.12)] text-[#2e7d52]",
  verified: "border-[#56605a] bg-[rgba(86,96,90,0.14)] text-[#56605a]",
};

const PRIORITY_DOT: Record<string, string> = {
  low: "#56605a",
  medium: "#c0964f",
  high: "#b3402e",
};

export default function AdminSnags({
  projectId,
  role,
}: {
  projectId: string;
  role: string;
}) {
  const [snags, setSnags] = useState<SnagDto[]>([]);
  const [logs, setLogs] = useState<SiteLogDto[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [toast, setToast] = useState<Toast | null>(null);
  const [adding, setAdding] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function showToast(kind: Toast["kind"], msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2800);
  }

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/snags?client_project_id=${encodeURIComponent(projectId)}`
    );
    if (res.ok) {
      const data = await res.json();
      setSnags(Array.isArray(data.snags) ? (data.snags as SnagDto[]) : []);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
    // Recent logs for linking snags to diary entries.
    void fetch(`/api/site-logs?client_project_id=${encodeURIComponent(projectId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) =>
        setLogs(
          Array.isArray(d?.logs)
            ? ((d.logs as SiteLogDto[]).slice(0, 12))
            : []
        )
      );
  }, [load, projectId]);

  async function patch(id: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/snags/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast("err", data.error ?? "Update failed.");
      return false;
    }
    await load();
    return true;
  }

  async function deleteSnag(id: string) {
    if (!window.confirm("Delete this snag?")) return;
    const res = await fetch(`/api/snags/${id}`, { method: "DELETE" });
    if (!res.ok) {
      showToast("err", "Delete failed.");
      return;
    }
    showToast("ok", "Snag deleted.");
    await load();
  }

  const counts = {
    open: snags.filter((s) => s.status === "open").length,
    fixed: snags.filter((s) => s.status === "fixed").length,
    verified: snags.filter((s) => s.status === "verified").length,
  };
  const visible =
    statusFilter === ""
      ? snags
      : snags.filter((s) => s.status === statusFilter);

  return (
    <div className="space-y-5">
      {toast && (
        <div
          role="status"
          className={`surface-elevated px-4 py-3 text-sm rounded-[var(--radius-card)] ${
            toast.kind === "err" ? "text-[#b3402e]" : "text-accent-deep"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { key: "", label: "All", value: snags.length },
              { key: "open", label: "Open", value: counts.open },
              { key: "fixed", label: "Fixed", value: counts.fixed },
              { key: "verified", label: "Verified", value: counts.verified },
            ] as { key: string; label: string; value: number }[]
          ).map((f) => (
            <button
              key={f.key || "all"}
              onClick={() => setStatusFilter(f.key)}
              className={`rounded-[var(--radius-control)] border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
                statusFilter === f.key
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-accent-deep"
                  : "hairline text-ink-mute hover:text-ink"
              }`}
            >
              {f.label} {f.value}
            </button>
          ))}
        </div>
        <button
          onClick={() => setAdding(true)}
          className="btn-primary h-10 px-5 text-[10px]"
        >
          <IconPlus size={13} />
          Add snag
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="surface-tile rounded-[var(--radius-card)] p-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={DEMO_FALLBACK}
            alt=""
            className="mx-auto mb-4 h-24 w-36 rounded-[var(--radius-control)] object-cover opacity-80"
          />
          <p className="text-ink-mute text-sm">
            {statusFilter
              ? `No ${snagStatusLabel(statusFilter).toLowerCase()} snags right now.`
              : "No snags yet. Log defects with a photo so nothing gets lost on site."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((s) => {
            const prio = (PRIORITY_DOT[s.priority] ?? "#56605a");
            return (
              <article
                key={s.id}
                className="surface-tile rounded-[var(--radius-card)] p-4 flex flex-col gap-3 sm:flex-row sm:items-start"
              >
                {s.photoUrl ? (
                  <button
                    type="button"
                    onClick={() => setLightbox(s.photoUrl)}
                    className="h-24 w-24 shrink-0 overflow-hidden rounded-[var(--radius-control)] border hairline"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.photoUrl}
                      alt="Snag photo"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ) : (
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-dashed hairline text-ink-mute">
                    <IconCamera size={18} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-[var(--radius-control)] border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] ${
                        STATUS_STYLES[s.status] ?? STATUS_STYLES.open
                      }`}
                    >
                      {snagStatusLabel(s.status)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-ink-mute">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: prio }}
                        aria-hidden
                      />
                      {snagPriorityLabel(s.priority)} priority
                    </span>
                    {s.logDate && (
                      <span className="font-mono text-[10px] text-ink-mute">
                        from log {formatLogDate(s.logDate)}
                      </span>
                    )}
                    <span className="font-mono text-[10px] text-ink-mute">
                      {diaryRelativeTime(s.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1.5 font-display text-base leading-relaxed">
                    {s.description}
                  </p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute">
                    {s.assignedTo ? `Assigned to ${s.assignedTo}` : "Unassigned"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 sm:flex-col">
                  {s.status === "open" && (
                    <button
                      onClick={() => void patch(s.id, { status: "fixed" })}
                      className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-control)] border border-[#2e7d52] bg-[rgba(46,125,82,0.12)] px-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#2e7d52] hover:bg-[rgba(46,125,82,0.2)] transition-colors"
                    >
                      <IconCheckCircle size={12} />
                      Mark fixed
                    </button>
                  )}
                  {s.status === "fixed" && (
                    <button
                      onClick={() => void patch(s.id, { status: "verified" })}
                      className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-control)] border hairline-strong px-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-mute hover:text-ink transition-colors"
                    >
                      <IconCheckCircle size={12} />
                      Verify
                    </button>
                  )}
                  {s.status !== "open" && (
                    <button
                      onClick={() => void patch(s.id, { status: "open" })}
                      className="inline-flex h-8 items-center rounded-[var(--radius-control)] border hairline px-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-mute hover:text-accent-deep transition-colors"
                    >
                      Reopen
                    </button>
                  )}
                  <button
                    aria-label="Delete snag"
                    onClick={() => void deleteSnag(s.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-ink-mute hover:bg-[rgba(179,64,46,0.1)] hover:text-[#b3402e] transition-colors"
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {adding && (
        <AddSnagModal
          projectId={projectId}
          logs={logs}
          onClose={() => setAdding(false)}
          onSaved={async (body) => {
            setBusy(true);
            const res = await fetch("/api/snags", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
            const data = await res.json().catch(() => ({}));
            setBusy(false);
            if (!res.ok) {
              showToast("err", data.error ?? "Create failed.");
              return;
            }
            showToast("ok", "Snag created.");
            setAdding(false);
            await load();
          }}
          busy={busy}
        />
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(10,24,19,0.85)] p-6"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-label="Snag photo preview"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Snag photo preview"
            className="max-h-[85dvh] max-w-full rounded-[var(--radius-control)]"
          />
          <button
            aria-label="Close preview"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(236,236,230,0.15)] text-[#ecece6] hover:bg-[rgba(236,236,230,0.3)] transition-colors"
          >
            <IconX size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function AddSnagModal({
  projectId,
  logs,
  onClose,
  onSaved,
  busy,
}: {
  projectId: string;
  logs: SiteLogDto[];
  onClose: () => void;
  onSaved: (body: Record<string, unknown>) => Promise<void>;
  busy: boolean;
}) {
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState("medium");
  const [siteLogId, setSiteLogId] = useState("");
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto({ file, preview: URL.createObjectURL(file) });
    e.target.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    let photoUrl: string | null = null;
    if (photo) {
      setUploading(true);
      const fd = new FormData();
      fd.append("client_project_id", projectId);
      fd.append("file", photo.file);
      const up = await fetch("/api/site-logs/upload", { method: "POST", body: fd });
      const upJson = await up.json().catch(() => ({}));
      setUploading(false);
      if (!up.ok) return;
      photoUrl = upJson.photo_url;
    }
    await onSaved({
      client_project_id: projectId,
      description: description.trim(),
      assigned_to: assignedTo.trim() || null,
      priority,
      site_log_id: siteLogId || null,
      photo_url: photoUrl,
    });
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(10,24,19,0.55)] p-4"
      role="dialog"
      aria-label="Add snag"
    >
      <form
        onSubmit={(e) => void submit(e)}
        className="surface-elevated w-full max-w-lg space-y-4 rounded-[var(--radius-card)] p-6"
      >
        <div className="flex items-center justify-between">
          <p className="font-display text-xl">Add snag.</p>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-ink-mute hover:bg-[var(--accent-soft)] hover:text-accent-deep transition-colors"
          >
            <IconX size={15} />
          </button>
        </div>
        <div>
          <label className={LABEL_CLS}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="e.g. Tiles chipped near the master bathroom door, need replacement"
            className={INPUT_CLS + " resize-y font-display"}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL_CLS}>Assigned to</label>
            <input
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="Contractor name"
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className={INPUT_CLS}
            >
              {SNAG_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {snagPriorityLabel(p)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={LABEL_CLS}>Link to site log (optional)</label>
          <select
            value={siteLogId}
            onChange={(e) => setSiteLogId(e.target.value)}
            className={INPUT_CLS}
          >
            <option value="">No log</option>
            {logs.map((l) => (
              <option key={l.id} value={l.id}>
                {formatLogDate(l.logDate)} - {(l.workDone ?? "").slice(0, 40)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPick}
          />
          {photo ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.preview}
                alt="Snag photo preview"
                className="h-20 w-20 rounded-[var(--radius-control)] border hairline object-cover"
              />
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#b3402e] hover:underline"
              >
                Remove photo
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-dashed border-[var(--line-strong)] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute hover:border-[#c0964f] hover:text-accent-deep transition-colors"
            >
              <IconCamera size={14} />
              Attach photo
            </button>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost h-10 px-4 text-[10px]">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || uploading || !description.trim()}
            className="btn-primary h-10 px-5 text-[10px]"
          >
            {uploading ? "Uploading..." : busy ? "Creating..." : "Add snag"}
          </button>
        </div>
      </form>
    </div>
  );
}
