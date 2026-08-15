"use client";

import { useCallback, useEffect, useState } from "react";
import { IconCheck, IconX } from "@/components/icons";
import type { AiOutput } from "@/lib/ai";
import PlanLimitModal from "./PlanLimitModal";

type Toast = { kind: "ok" | "err"; msg: string };

type SocialPost = {
  id: string;
  clientProjectId: string;
  caption: string | null;
  hashtags: string | null;
  imageUrls: string[];
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string | null;
};

const STATUS_BADGE: Record<string, string> = {
  draft: "border-[var(--accent)] bg-[var(--accent-soft)] text-accent-deep",
  scheduled: "border-[#56605a]/40 bg-[#56605a]/10 text-[#56605a]",
  published: "border-[#3f6b4f]/40 bg-[#3f6b4f]/10 text-[#3f6b4f]",
};

export default function AdminSocial({ projectId }: { projectId: string }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [busy, setBusy] = useState(false);
  const [candidates, setCandidates] = useState<{ url: string; label: string }[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [output, setOutput] = useState<AiOutput | null>(null);
  const [savedGenId, setSavedGenId] = useState<string | null>(null);
  const [posts, setPosts] = useState<SocialPost[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [editing, setEditing] = useState<SocialPost | null>(null);
  const [generationCount, setGenerationCount] = useState(0);
  const [planError, setPlanError] = useState<string | null>(null);

  function showToast(kind: Toast["kind"], msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2600);
  }

  const loadPosts = useCallback(async () => {
    try {
      const res = await fetch(`/api/social/posts?client_project_id=${encodeURIComponent(projectId)}`);
      if (!res.ok) return;
      const data = await res.json();
      setPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch {
      /* keep current */
    }
  }, [projectId]);

  const loadCandidates = useCallback(async () => {
    const next: { url: string; label: string }[] = [];
    try {
      // Diary photos.
      const logsRes = await fetch(`/api/site-logs?client_project_id=${encodeURIComponent(projectId)}`);
      if (logsRes.ok) {
        const data = await logsRes.json();
        for (const log of Array.isArray(data.logs) ? data.logs : []) {
          for (const p of Array.isArray(log.photos) ? log.photos : []) {
            next.push({ url: String(p), label: "Site photo" });
          }
        }
      }
      // Board thumbnails (first few item images per board).
      const boardsRes = await fetch(`/api/boards?client_project_id=${encodeURIComponent(projectId)}`);
      if (boardsRes.ok) {
        const data = await boardsRes.json();
        const boards = Array.isArray(data.boards) ? data.boards : [];
        for (const b of boards.slice(0, 4)) {
          const detail = await fetch(`/api/boards/${encodeURIComponent(String(b.id))}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null);
          const items = detail?.board?.items ?? [];
          for (const it of items) {
            if (it?.material?.imageUrl) {
              next.push({ url: String(it.material.imageUrl), label: String(b.title ?? "Board") });
            }
          }
        }
      }
    } catch {
      /* offline */
    }
    const seen = new Set<string>();
    setCandidates(next.filter((c) => (seen.has(c.url) ? false : (seen.add(c.url), true))).slice(0, 24));
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPosts();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCandidates();
    void fetch("/api/ai/generations")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setGenerationCount(Array.isArray(d?.generations) ? d.generations.length : 0));
  }, [loadPosts, loadCandidates]);

  function togglePhoto(url: string) {
    setSelected((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
    );
  }

  async function generateCaptions() {
    if (busy) return;
    if (selected.length === 0) {
      showToast("err", "Select at least one photo for the captions.");
      return;
    }
    setBusy(true);
    setOutput(null);
    setSavedGenId(null);
    try {
      const r = await fetch("/api/ai/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_project_id: projectId,
          type: "social_caption",
          input: { photo_urls: selected },
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
      setOutput(j.generation?.output ?? null);
      setSavedGenId(j.generation?.id ?? null);
      setGenerationCount((c) => c + 1);
      showToast(j.mock ? "ok" : "ok", j.mock ? "Captions drafted (dev mode)." : "Captions generated.");
    } catch {
      showToast("err", "Network problem. Generation not saved.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      showToast("err", "Clipboard unavailable.");
    }
  }

  async function saveAsDraft() {
    if (!savedGenId || busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/social/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_project_id: projectId, ai_generation_id: savedGenId, photo_urls: selected }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast("err", j.error || `Save failed (${r.status})`);
        return;
      }
      showToast("ok", "Draft saved to the queue.");
      setSavedGenId(null);
      setOutput(null);
      await loadPosts();
    } catch {
      showToast("err", "Network problem. Draft not saved.");
    } finally {
      setBusy(false);
    }
  }

  async function publishPost(id: string) {
    const r = await fetch(`/api/social/posts/${id}/publish`, { method: "POST", credentials: "include" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      showToast("err", j.error || "Publish failed.");
      return;
    }
    showToast("ok", "Published.");
    await loadPosts();
  }

  const drafts = (posts ?? []).filter((p) => p.status !== "published");
  const published = (posts ?? []).filter((p) => p.status === "published");

  return (
    <div className="space-y-8">
      {toast && (
        <p
          role="status"
          className={`text-sm ${toast.kind === "ok" ? "text-accent-deep" : "text-[#8a2f2f]"}`}
        >
          {toast.msg}
        </p>
      )}

      {/* Header stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "AI generations", value: String(generationCount) },
          { label: "Drafts", value: String(drafts.length) },
          { label: "Published", value: String(published.length) },
          { label: "Photos ready", value: String(candidates.length) },
        ].map((s) => (
          <div key={s.label} className="surface-tile rounded-[var(--radius-card)] p-4">
            <p className="block font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a] mb-2">
              {s.label}
            </p>
            <p className="font-mono text-2xl">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Autopilot */}
      <section className="surface-tile rounded-[var(--radius-card)] p-6 space-y-5">
        <div>
          <p className="chrome-pill inline-flex">Social autopilot</p>
          <p className="text-sm text-ink-mute mt-1">
            Pick the photos, get three editorial captions, one Hinglish
            line and hashtags. Save the best one as a draft.
          </p>
        </div>

        {candidates.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="block font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a]">
                Photos ({selected.length} selected)
              </p>
              <button
                onClick={() => setSelected([])}
                className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute hover:text-ink"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {candidates.map((c) => {
                const active = selected.includes(c.url);
                return (
                  <button
                    key={c.url}
                    onClick={() => togglePhoto(c.url)}
                    aria-pressed={active}
                    title={c.label}
                    className={`relative h-20 w-20 overflow-hidden rounded-[var(--radius-control)] border transition-colors ${
                      active
                        ? "border-[#c0964f] ring-2 ring-[#c0964f]/40"
                        : "border hairline hover:border-[#c0964f]/60"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.url} alt={c.label} className="h-full w-full object-cover" />
                    {active && (
                      <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#c0964f] text-[#ECECE6]">
                        <IconCheck size={11} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button
          onClick={() => void generateCaptions()}
          disabled={busy || selected.length === 0}
          className="btn-primary"
        >
          {busy ? "Writing captions..." : "Generate captions"}
        </button>

        {output && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(output.captions ?? []).slice(0, 3).map((c, i) => (
                <div key={i} className="rounded-[var(--radius-card)] border hairline bg-[rgba(214,203,179,0.35)] p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#56605a]">
                      Caption {i + 1}
                    </p>
                    <button
                      onClick={() => void copy(c, `c${i}`)}
                      className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent-deep hover:underline"
                    >
                      {copied === `c${i}` ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="font-display text-[15px] leading-relaxed">{c}</p>
                </div>
              ))}
              {output.hinglish && (
                <div className="rounded-[var(--radius-card)] border hairline bg-[rgba(214,203,179,0.35)] p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#56605a]">
                      Hinglish
                    </p>
                    <button
                      onClick={() => void copy(output.hinglish ?? "", "hi")}
                      className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent-deep hover:underline"
                    >
                      {copied === "hi" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="font-display text-[15px] leading-relaxed">{output.hinglish}</p>
                </div>
              )}
            </div>

            {Array.isArray(output.hashtags) && output.hashtags.length > 0 && (
              <div>
                <p className="block font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a] mb-2">
                  Hashtags
                </p>
                <div className="flex flex-wrap gap-2">
                  {output.hashtags.map((h) => (
                    <button
                      key={h}
                      onClick={() => void copy(h, h)}
                      className="rounded-md border hairline bg-canvas px-2.5 py-1 font-mono text-xs text-[#56605a] hover:text-ink"
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => void saveAsDraft()}
              disabled={busy || !savedGenId}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#ECECE6] bg-[#122A20] hover:opacity-90 disabled:opacity-50"
            >
              Save as draft
            </button>
          </div>
        )}
      </section>

      {/* Drafts */}
      <section className="space-y-4">
        <p className="chrome-pill inline-flex">Drafts &amp; published</p>
        {posts === null ? (
          <p className="text-sm text-ink-mute">Loading posts...</p>
        ) : posts.length === 0 ? (
          <div className="surface-tile rounded-[var(--radius-card)] p-8 text-center">
            <p className="text-ink-mute text-sm">
              No posts yet. Generate captions above and save one as a draft.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {posts.map((p) => (
              <div key={p.id} className="surface-tile rounded-[var(--radius-card)] p-4 space-y-3">
                <div className="flex gap-3">
                  {p.imageUrls[0] ? (
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[var(--radius-control)] border hairline">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.imageUrls[0]} alt="" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-20 w-20 shrink-0 rounded-[var(--radius-control)] bg-[#d6cbb3]/50" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex rounded-md border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] ${STATUS_BADGE[p.status] ?? STATUS_BADGE.draft}`}>
                        {p.status}
                      </span>
                      {p.scheduledAt && (
                        <span className="font-mono text-[10px] text-[#56605a]">
                          {p.scheduledAt.slice(0, 10)}
                        </span>
                      )}
                    </div>
                    <p className="font-display text-sm leading-snug mt-2 line-clamp-3">
                      {p.caption || "No caption"}
                    </p>
                  </div>
                </div>
                {p.hashtags && (
                  <p className="font-mono text-[10px] text-[#56605a] truncate">{p.hashtags}</p>
                )}
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => setEditing(p)}
                    className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent-deep hover:underline"
                  >
                    Edit
                  </button>
                  {p.status !== "published" && (
                    <button
                      onClick={() => void publishPost(p.id)}
                      className="rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[#ECECE6] bg-[#3f6b4f] hover:opacity-90"
                    >
                      Publish
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {editing && (
        <EditPostModal
          post={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await loadPosts();
          }}
          showToast={showToast}
        />
      )}
      <PlanLimitModal reason={planError} onClose={() => setPlanError(null)} />
    </div>
  );
}

function EditPostModal({
  post,
  onClose,
  onSaved,
  showToast,
}: {
  post: SocialPost;
  onClose: () => void;
  onSaved: () => Promise<void>;
  showToast: (kind: Toast["kind"], msg: string) => void;
}) {
  const [caption, setCaption] = useState(post.caption ?? "");
  const [hashtags, setHashtags] = useState(post.hashtags ?? "");
  const [status, setStatus] = useState(post.status === "published" ? "scheduled" : post.status);
  const [scheduledAt, setScheduledAt] = useState(
    post.scheduledAt ? post.scheduledAt.slice(0, 10) : ""
  );
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await fetch(`/api/social/posts/${post.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption,
          hashtags,
          status,
          scheduled_at: scheduledAt ? `${scheduledAt}T10:00:00.000Z` : null,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast("err", j.error || "Update failed.");
        return;
      }
      showToast("ok", "Post updated.");
      await onSaved();
    } catch {
      showToast("err", "Network problem. Update not saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(10,24,19,0.55)] p-4"
      role="dialog"
      aria-label="Edit social post"
    >
      <form
        onSubmit={(e) => void submit(e)}
        className="surface-elevated w-full max-w-lg space-y-4 rounded-[var(--radius-card)] p-6"
      >
        <div className="flex items-center justify-between">
          <p className="font-display text-xl">Edit post.</p>
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
          <label
            htmlFor="edit-caption"
            className="block font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a] mb-2"
          >
            Caption
          </label>
          <textarea
            id="edit-caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={4}
            className="w-full bg-canvas border hairline rounded-[var(--radius-control)] px-3 py-2 text-sm font-display focus:border-[var(--accent-deep)] focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="edit-hashtags"
            className="block font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a] mb-2"
          >
            Hashtags
          </label>
          <input
            id="edit-hashtags"
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            className="w-full bg-canvas border hairline rounded-[var(--radius-control)] px-3 py-2 text-sm font-mono focus:border-[var(--accent-deep)] focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="edit-status"
              className="block font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a] mb-2"
            >
              Status
            </label>
            <select
              id="edit-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-canvas border hairline rounded-[var(--radius-control)] px-3 py-2 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="edit-schedule"
              className="block font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a] mb-2"
            >
              Schedule date
            </label>
            <input
              id="edit-schedule"
              type="date"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full bg-canvas border hairline rounded-[var(--radius-control)] px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost h-10 px-4 text-[10px]">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="btn-primary h-10 px-5 text-[10px]">
            {busy ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
