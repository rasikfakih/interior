"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { qrMatrix } from "@/lib/qrcode";
import { relativeTime, shortDate } from "@/lib/proposals";
import { IconCheck, IconX } from "@/components/icons";

type Toast = { kind: "ok" | "err"; msg: string };

type PortalInfo = {
  token: string | null;
  accessCount: number;
  createdAt: string | null;
  urls: {
    default: string;
    subdomain: string | null;
    customDomain: string | null;
  } | null;
};

type Comment = {
  id: string;
  author: string;
  message: string;
  createdAt: string | null;
};

const LABEL_CLS =
  "block font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a] mb-2";

function QrCanvas({ url, ink, paper }: { url: string; ink: string; paper: string }) {
  useEffect(() => {
    const canvas = document.getElementById("portal-qr") as HTMLCanvasElement | null;
    if (!canvas) return;
    const { size, modules } = qrMatrix(url);
    const SCALE = 8;
    const QUIET = 4;
    const dim = (size + QUIET * 2) * SCALE;
    canvas.width = dim;
    canvas.height = dim;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, dim, dim);
    ctx.fillStyle = ink;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (modules[y * size + x]) {
          ctx.fillRect((x + QUIET) * SCALE, (y + QUIET) * SCALE, SCALE, SCALE);
        }
      }
    }
  }, [url, ink, paper]);
  return (
    <canvas
      id="portal-qr"
      className="rounded-lg border hairline bg-[#ECECE6]"
      style={{ width: 168, height: 168 }}
      aria-label="Portal QR code"
    />
  );
}

export default function AdminPortal({
  projectId,
  role,
}: {
  projectId: string;
  role: string;
}) {
  const [portal, setPortal] = useState<PortalInfo | null>(null);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function showToast(kind: Toast["kind"], msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2400);
  }

  useEffect(() => {
    void fetch(`/api/client-projects/${projectId}/portal`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPortal(d?.portal ?? null));
    void fetch(`/api/client-projects/${projectId}/portal/comments`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setComments(d?.comments ?? []));
  }, [projectId]);

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      showToast("err", "Clipboard unavailable.");
    }
  }

  async function regenerate() {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/client-projects/${projectId}/portal/generate`, {
        method: "POST",
        credentials: "include",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast("err", j.error || `Regenerate failed (${r.status})`);
        return;
      }
      setPortal({
        token: j.token,
        accessCount: 0,
        createdAt: new Date().toISOString(),
        urls: {
          default: j.urls?.default ?? `${window.location.origin}/portal/${j.token}`,
          subdomain: j.urls?.subdomain ?? null,
          customDomain: j.urls?.customDomain ?? null,
        },
      });
      showToast("ok", "New portal link generated. The old link no longer works.");
    } catch {
      showToast("err", "Network problem. Regenerate not saved.");
    } finally {
      setBusy(false);
    }
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || sending) return;
    setSending(true);
    try {
      const r = await fetch(`/api/client-projects/${projectId}/portal/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast("err", j.error || `Reply failed (${r.status})`);
        return;
      }
      setComments((c) => [
        ...(c ?? []),
        {
          id: String(j.comment?.id ?? crypto.randomUUID()),
          author: "studio",
          message: String(j.comment?.message ?? reply),
          createdAt: j.comment?.createdAt ?? new Date().toISOString(),
        },
      ]);
      setReply("");
    } catch {
      showToast("err", "Network problem. Reply not saved.");
    } finally {
      setSending(false);
    }
  }

  const urls = portal?.urls;
  const qrUrl = urls?.subdomain ?? urls?.customDomain ?? urls?.default ?? null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="chrome-pill mb-3 inline-flex">Client portal</p>
          <h1 className="text-3xl md:text-5xl tracking-tighter">Share with your client.</h1>
          <p className="text-ink-mute text-sm mt-2">
            The link is the permission - no login needed. Boards, BOQ, site
            diary and snags render live on it. Role:{" "}
            <span className="font-mono text-xs">{role}</span>.
          </p>
        </div>
        <Link
          href={`/admin/client-projects/${projectId}`}
          className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent-deep hover:underline"
        >
          Back to project
        </Link>
      </header>

      {toast && (
        <div
          role="status"
          className={`surface-elevated px-4 py-3 text-sm rounded-[var(--radius-card)] ${
            toast.kind === "ok" ? "text-accent-deep" : "text-[#8a2f2f]"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {portal === null ? (
        <p className="text-sm text-ink-mute">Loading portal settings...</p>
      ) : portal.token ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: links + QR. */}
          <div className="lg:col-span-7 space-y-4">
            <div className="surface-tile rounded-[var(--radius-card)] p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className={LABEL_CLS}>Share link</p>
                  <p className="font-mono text-sm break-all">{urls?.default}</p>
                </div>
                <button
                  onClick={() => void copy(urls?.default ?? "", "default")}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border hairline px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute hover:text-ink"
                >
                  {copied === "default" ? <IconCheck size={13} /> : null}
                  {copied === "default" ? "Copied" : "Copy"}
                </button>
              </div>

              {urls?.subdomain && (
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#56605a] mb-1">
                      Subdomain link
                    </p>
                    <p className="font-mono text-xs break-all text-ink-mute">{urls.subdomain}</p>
                  </div>
                  <button
                    onClick={() => void copy(urls.subdomain ?? "", "sub")}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border hairline px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute hover:text-ink"
                  >
                    {copied === "sub" ? <IconCheck size={13} /> : null}
                    {copied === "sub" ? "Copied" : "Copy"}
                  </button>
                </div>
              )}
              {urls?.customDomain && (
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#56605a] mb-1">
                      Custom domain link
                    </p>
                    <p className="font-mono text-xs break-all text-ink-mute">{urls.customDomain}</p>
                  </div>
                  <button
                    onClick={() => void copy(urls.customDomain ?? "", "dom")}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border hairline px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute hover:text-ink"
                  >
                    {copied === "dom" ? <IconCheck size={13} /> : null}
                    {copied === "dom" ? "Copied" : "Copy"}
                  </button>
                </div>
              )}

              <div className="mt-5 pt-5 border-t hairline flex flex-wrap items-center gap-4">
                <button
                  onClick={() => void regenerate()}
                  disabled={busy}
                  className="btn-primary"
                >
                  {busy ? "Generating..." : "Regenerate link"}
                </button>
                <Link
                  href={urls?.default ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent-deep hover:underline"
                >
                  Open portal
                </Link>
                <div className="ml-auto flex gap-6">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#56605a] mb-0.5">
                      Accessed
                    </p>
                    <p className="font-mono text-lg">{portal.accessCount}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#56605a] mb-0.5">
                      Created
                    </p>
                    <p className="font-mono text-lg">{shortDate(portal.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: QR. */}
          <div className="lg:col-span-5">
            <div className="surface-tile rounded-[var(--radius-card)] p-6 flex flex-col items-center gap-3">
              <p className={LABEL_CLS + " self-start"}>Scan to open</p>
              {qrUrl ? (
                <QrCanvas url={qrUrl} ink="#122A20" paper="#ECECE6" />
              ) : (
                <div className="h-[168px] w-[168px] rounded-lg border hairline flex items-center justify-center">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#56605a] text-center px-4">
                    Generate a link to show the QR
                  </p>
                </div>
              )}
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#56605a]">
                {urls?.subdomain ? "Subdomain" : urls?.customDomain ? "Custom domain" : "Default host"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="surface-tile rounded-[var(--radius-card)] p-8 max-w-2xl">
          <p className="text-ink-mute text-sm mb-4">
            No portal link yet. Generate one to share boards, the BOQ, site
            photos and snags with your client on a private link.
          </p>
          <button
            onClick={() => void regenerate()}
            disabled={busy}
            className="btn-primary"
          >
            {busy ? "Generating..." : "Generate portal link"}
          </button>
        </div>
      )}

      {/* Comments thread. */}
      <section className="space-y-4">
        <p className="chrome-pill inline-flex">Client thread</p>
        {comments === null ? (
          <p className="text-sm text-ink-mute">Loading messages...</p>
        ) : comments.length === 0 ? (
          <div className="surface-tile rounded-[var(--radius-card)] p-6">
            <p className="text-ink-mute text-sm">
              No messages yet. When your client writes on the portal, replies
              here appear in their thread instantly.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((c) => (
              <div
                key={c.id}
                className={`surface-tile rounded-[var(--radius-card)] p-4 max-w-2xl ${
                  c.author === "client" ? "border-[var(--accent)]/30" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#56605a]">
                    {c.author === "client" ? "Client" : "Studio (you)"}
                  </p>
                  {c.createdAt && (
                    <p className="font-mono text-[10px] text-[#56605a]">
                      {relativeTime(c.createdAt)}
                    </p>
                  )}
                </div>
                <p className="text-sm whitespace-pre-line">{c.message}</p>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={sendReply} className="flex gap-2 max-w-2xl">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Reply as the studio..."
            rows={2}
            className="flex-1 bg-canvas border hairline rounded-[var(--radius-control)] px-3 py-2 text-sm focus:border-[var(--accent-deep)] focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !reply.trim()}
            className="btn-primary self-end"
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </form>
      </section>
    </div>
  );
}
