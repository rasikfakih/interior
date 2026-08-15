"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  diaryRelativeTime,
  formatLogDate,
  parsePhotos,
  queueKey,
  todayIso,
  weatherLabel,
  WEATHER_OPTIONS,
  type QueuedLog,
  type SiteLogDto,
} from "@/lib/site-diary";
import {
  IconCamera,
  IconDownload,
  IconMic,
  IconPencil,
  IconTrash,
  IconX,
} from "@/components/icons";
import AdminWeeklyReport from "./AdminWeeklyReport";

type Toast = { kind: "ok" | "err" | "info"; msg: string };
type PendingPhoto = { id: string; file: File; preview: string };
type LogDraft = {
  logDate: string;
  labourCount: string;
  workDone: string;
  voiceTranscript: string;
  weather: string;
};

const INPUT_CLS =
  "w-full bg-canvas border hairline rounded-[var(--radius-control)] px-3 py-2 text-sm focus:border-[var(--accent-deep)] focus:outline-none";
const LABEL_CLS =
  "block font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a] mb-2";
const DEMO_FALLBACK = "/demo/living-room-1.jpg";

/** Minimal Web Speech API typing (not in lib.dom). */
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult:
    | ((
        e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }
      ) => void)
    | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function speechCtor(): SpeechRecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

function daysAgoIso(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function readQueue(projectId: string): QueuedLog[] {
  try {
    const raw = localStorage.getItem(queueKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedLog[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(projectId: string, queue: QueuedLog[]) {
  try {
    localStorage.setItem(queueKey(projectId), JSON.stringify(queue));
  } catch {
    /* storage full or unavailable - the in-memory badge still counts */
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(",");
  const mime = /data:([^;]+);/.exec(meta)?.[1] ?? "image/jpeg";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export default function AdminDiary({
  projectId,
  role,
}: {
  projectId: string;
  role: string;
}) {
  const [logs, setLogs] = useState<SiteLogDto[]>([]);
  const [openSnags, setOpenSnags] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(todayIso());
  const [toast, setToast] = useState<Toast | null>(null);
  const [busy, setBusy] = useState(false);
  const [queue, setQueue] = useState<QueuedLog[]>([]);
  // Start "online" on both server and client so SSR HTML matches
  // hydration; the window online/offline events correct it right after
  // mount (and on real network changes).
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [editing, setEditing] = useState<SiteLogDto | null>(null);

  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [draft, setDraft] = useState<LogDraft>({
    logDate: todayIso(),
    labourCount: "",
    workDone: "",
    voiceTranscript: "",
    weather: "sunny",
  });
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const queueRef = useRef<QueuedLog[]>([]);

  function showToast(kind: Toast["kind"], msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 3000);
  }

  const loadLogs = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/site-logs?client_project_id=${encodeURIComponent(projectId)}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setLogs(Array.isArray(data.logs) ? (data.logs as SiteLogDto[]) : []);
    } catch {
      /* offline - keep current list */
    }
  }, [projectId]);

  const loadOpenSnags = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/snags?client_project_id=${encodeURIComponent(projectId)}&status=open`
      );
      if (!res.ok) return;
      const data = await res.json();
      setOpenSnags(Array.isArray(data.snags) ? data.snags.length : 0);
    } catch {
      /* offline */
    }
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQueue(readQueue(projectId));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadLogs();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadOpenSnags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    queueRef.current = queue;
    writeQueue(projectId, queue);
  }, [queue, projectId]);

  // Online/offline transitions: badge + queue sync when the network
  // comes back.
  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      void syncQueue();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const visibleLogs = selectedDate
    ? logs.filter((l) => (l.logDate ?? "").slice(0, 10) === selectedDate)
    : logs;

  const totalLabour = logs.reduce((sum, l) => sum + (l.labourCount || 0), 0);
  const weekStart = daysAgoIso(6);
  const thisWeek = logs.filter((l) => (l.logDate ?? "") >= weekStart).length;

  // ---- photo selection ----
  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const next: PendingPhoto[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...next]);
    e.target.value = "";
  }

  function removePhoto(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  // ---- voice transcript ----
  function toggleVoice() {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const Ctor = speechCtor();
    if (!Ctor) {
      showToast("err", "Speech recognition is not supported in this browser.");
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-IN";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i += 1) {
        text += e.results[i][0].transcript + " ";
      }
      setDraft((d) => ({
        ...d,
        voiceTranscript: (d.voiceTranscript ? d.voiceTranscript + " " : "") + text.trim(),
      }));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  // ---- save (online) / queue (offline) ----
  async function saveLog() {
    if (!draft.workDone.trim() && photos.length === 0) {
      showToast("err", "Add work done notes or at least one photo.");
      return;
    }
    const payload = {
      clientProjectId: projectId,
      logDate: draft.logDate || null,
      labourCount: Number(draft.labourCount) || 0,
      workDone: draft.workDone.trim() || null,
      voiceTranscript: draft.voiceTranscript.trim() || null,
      weather: draft.weather || null,
      photos: photos.map((p) => p.preview),
    };

    if (!navigator.onLine) {
      // Persist photos as base64 data URLs (blob: object URLs do not
      // survive reload and cannot be re-uploaded on sync).
      const base64Photos = await Promise.all(
        photos.map((p) => fileToDataUrl(p.file))
      );
      const queued: QueuedLog = {
        id: crypto.randomUUID(),
        ...payload,
        photos: base64Photos,
        queuedAt: Date.now(),
      };
      setQueue((prev) => [...prev, queued]);
      setPhotos([]);
      setDraft({
        logDate: todayIso(),
        labourCount: "",
        workDone: "",
        voiceTranscript: "",
        weather: "sunny",
      });
      showToast("info", "Offline - log saved to the queue.");
      return;
    }

    setBusy(true);
    try {
      const urls: string[] = [];
      for (const p of photos) {
        const fd = new FormData();
        fd.append("client_project_id", projectId);
        fd.append("file", p.file);
        const up = await fetch("/api/site-logs/upload", { method: "POST", body: fd });
        const upJson = await up.json().catch(() => ({}));
        if (!up.ok) {
          showToast("err", upJson.error ?? "Photo upload failed.");
          setBusy(false);
          return;
        }
        urls.push(upJson.photo_url);
      }
      const res = await fetch("/api/site-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_project_id: payload.clientProjectId,
          log_date: payload.logDate,
          labour_count: payload.labourCount,
          work_done: payload.workDone,
          voice_transcript: payload.voiceTranscript,
          weather: payload.weather,
          photos: urls,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast("err", data.error ?? "Save failed.");
        return;
      }
      setPhotos([]);
      setDraft({
        logDate: todayIso(),
        labourCount: "",
        workDone: "",
        voiceTranscript: "",
        weather: "sunny",
      });
      showToast("ok", "Log saved.");
      await loadLogs();
    } catch {
      showToast("err", "Network problem - try again or queue offline.");
    } finally {
      setBusy(false);
    }
  }

  // ---- offline queue sync ----
  async function syncQueue() {
    const pending = queueRef.current;
    if (pending.length === 0 || syncing) return;
    setSyncing(true);
    let ok = 0;
    let failed = 0;
    const remaining: QueuedLog[] = [];
    for (const q of pending) {
      try {
        const urls: string[] = [];
        for (const photo of q.photos) {
          const fd = new FormData();
          fd.append("client_project_id", q.clientProjectId);
          fd.append("file", new File([dataUrlToBlob(photo)], `photo-${ok}.jpg`, {
            type: "image/jpeg",
          }));
          const up = await fetch("/api/site-logs/upload", {
            method: "POST",
            body: fd,
          });
          const upJson = await up.json().catch(() => ({}));
          if (!up.ok) throw new Error(upJson.error ?? "upload failed");
          urls.push(upJson.photo_url);
        }
        const res = await fetch("/api/site-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_project_id: q.clientProjectId,
            log_date: q.logDate,
            labour_count: q.labourCount,
            work_done: q.workDone,
            voice_transcript: q.voiceTranscript,
            weather: q.weather,
            photos: urls,
          }),
        });
        if (!res.ok) throw new Error("log post failed");
        ok += 1;
      } catch {
        failed += 1;
        remaining.push(q);
      }
    }
    setQueue(remaining);
    setSyncing(false);
    await loadLogs();
    showToast(
      ok > 0 ? "ok" : "err",
      ok > 0 ? `Synced ${ok} log${ok === 1 ? "" : "s"} from the queue.` : "Queue sync failed."
    );
  }

  // ---- edit / delete ----
  async function patchLog(id: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/site-logs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast("err", data.error ?? "Update failed.");
      return false;
    }
    await loadLogs();
    return true;
  }

  async function deleteLog(id: string) {
    if (!window.confirm("Delete this site log? Linked snags keep their photos.")) return;
    const res = await fetch(`/api/site-logs/${id}`, { method: "DELETE" });
    if (!res.ok) {
      showToast("err", "Delete failed.");
      return;
    }
    showToast("ok", "Log deleted.");
    await loadLogs();
  }

  // ---- weekly export ----
  async function exportWeekly() {
    const from = daysAgoIso(6);
    const to = todayIso();
    const url = `/api/site-logs/export?client_project_id=${encodeURIComponent(
      projectId
    )}&from=${from}&to=${to}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        showToast("err", "Export failed.");
        return;
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `weekly-report-${projectId.slice(0, 8)}-${to}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      showToast("ok", "Weekly report exported.");
    } catch {
      showToast("err", "Export failed.");
    }
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div
          role="status"
          className={`surface-elevated px-4 py-3 text-sm rounded-[var(--radius-card)] ${
            toast.kind === "err"
              ? "text-[#b3402e]"
              : toast.kind === "info"
                ? "text-ink-mute"
                : "text-accent-deep"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* AI weekly report (Module 9) */}
      <AdminWeeklyReport projectId={projectId} />

      {/* Header row: date filter + queue + export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className={LABEL_CLS + " mb-0"}>
            <span className="mr-2">Date</span>
            <input
              type="date"
              value={selectedDate ?? ""}
              onChange={(e) => setSelectedDate(e.target.value || null)}
              className={INPUT_CLS + " w-auto"}
            />
          </label>
          {selectedDate && (
            <button
              onClick={() => setSelectedDate(null)}
              className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute hover:text-ink"
            >
              All dates
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {queue.length > 0 && (
            <span
              role="status"
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-[#9a6a1f] bg-[rgba(154,106,31,0.12)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[#9a6a1f]"
            >
              <IconCamera size={12} />
              Offline Queue {queue.length}
            </span>
          )}
          {!online && (
            <span className="inline-flex rounded-[var(--radius-control)] border border-[#b3402e] bg-[rgba(179,64,46,0.1)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[#b3402e]">
              Offline
            </span>
          )}
          {queue.length > 0 && online && (
            <button
              onClick={() => void syncQueue()}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-[#c0964f] bg-[var(--accent-soft)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-accent-deep hover:border-[var(--accent-deep)] transition-colors disabled:opacity-50"
            >
              <IconDownload size={12} />
              {syncing ? "Syncing..." : "Sync now"}
            </button>
          )}
          <button
            onClick={() => void exportWeekly()}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border hairline-strong px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute hover:text-ink transition-colors"
          >
            <IconDownload size={12} />
            Export weekly report
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Total logs", value: String(logs.length) },
          { label: "This week", value: String(thisWeek) },
          { label: "Total labour", value: String(totalLabour) },
          { label: "Open snags", value: String(openSnags) },
        ].map((s) => (
          <div key={s.label} className="surface-tile rounded-[var(--radius-card)] p-4">
            <p className={LABEL_CLS}>{s.label}</p>
            <p className="font-mono text-2xl tracking-tight">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Add log */}
      <section className="surface-tile rounded-[var(--radius-card)] p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-display text-lg">Add today&apos;s log.</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute">
            {weatherLabel(draft.weather)}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className={LABEL_CLS}>Date</label>
              <input
                type="date"
                value={draft.logDate}
                onChange={(e) => setDraft({ ...draft, logDate: e.target.value })}
                className={INPUT_CLS + " w-auto font-mono"}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Labour count</label>
              <input
                type="number"
                min={0}
                value={draft.labourCount}
                onChange={(e) => setDraft({ ...draft, labourCount: e.target.value })}
                placeholder="0"
                className={INPUT_CLS + " w-32 font-mono"}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Weather</label>
              <select
                value={draft.weather}
                onChange={(e) => setDraft({ ...draft, weather: e.target.value })}
                className={INPUT_CLS + " w-40"}
              >
                {WEATHER_OPTIONS.map((w) => (
                  <option key={w} value={w}>
                    {weatherLabel(w)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className={LABEL_CLS}>Work done</label>
              <textarea
                value={draft.workDone}
                onChange={(e) => setDraft({ ...draft, workDone: e.target.value })}
                placeholder="POP work done in master bedroom, 2 labour absent, tiles delivered"
                rows={3}
                className={INPUT_CLS + " resize-y font-display"}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>
                Voice transcript
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`ml-3 inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] transition-colors ${
                    listening
                      ? "border-[#b3402e] bg-[rgba(179,64,46,0.1)] text-[#b3402e]"
                      : "border-[var(--accent)] bg-[var(--accent-soft)] text-accent-deep"
                  }`}
                >
                  <IconMic size={11} />
                  {listening ? "Listening..." : "Record"}
                </button>
              </label>
              <textarea
                value={draft.voiceTranscript}
                onChange={(e) =>
                  setDraft({ ...draft, voiceTranscript: e.target.value })
                }
                placeholder="Dictate the day's notes instead of typing"
                rows={2}
                className={INPUT_CLS + " resize-y font-display italic text-[#56605a]"}
              />
            </div>
          </div>
        </div>

        {/* Photo capture + preview */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={onPickFiles}
          />
          <div className="flex flex-wrap items-start gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-24 w-24 flex-col items-center justify-center gap-1.5 rounded-[var(--radius-control)] border border-dashed border-[var(--line-strong)] text-ink-mute hover:border-[#c0964f] hover:text-accent-deep transition-colors"
            >
              <IconCamera size={20} />
              <span className="font-mono text-[9px] uppercase tracking-[0.14em]">
                Camera
              </span>
            </button>
            {photos.map((p) => (
              <div
                key={p.id}
                className="relative h-24 w-24 overflow-hidden rounded-[var(--radius-control)] border hairline"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt="Selected site photo" className="h-full w-full object-cover" />
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() => removePhoto(p.id)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(18,42,32,0.75)] text-[#ecece6] hover:bg-[#b3402e] transition-colors"
                >
                  <IconX size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void saveLog()}
            disabled={busy || (!online && !draft.workDone.trim() && photos.length === 0)}
            className="btn-primary h-10 px-5 text-[10px]"
          >
            {busy ? "Saving..." : online ? "Save log" : "Save to queue"}
          </button>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute">
            {role} · {online ? "online" : "offline"}
          </p>
        </div>
      </section>

      {/* Timeline */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-display text-xl">
            {selectedDate ? formatLogDate(selectedDate) : "All entries"}.
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute">
            {visibleLogs.length} log{visibleLogs.length === 1 ? "" : "s"}
          </p>
        </div>
        {visibleLogs.length === 0 ? (
          <div className="surface-tile rounded-[var(--radius-card)] p-8 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={DEMO_FALLBACK}
              alt=""
              className="mx-auto mb-4 h-24 w-36 rounded-[var(--radius-control)] object-cover opacity-80"
            />
            <p className="text-ink-mute text-sm">
              {selectedDate
                ? `No logs on ${formatLogDate(selectedDate)}. Add the day's entry above.`
                : "No site logs yet. Add the first entry above."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleLogs.map((log) => {
              const photosList = parsePhotos(log.photos);
              return (
                <article
                  key={log.id}
                  className="surface-tile rounded-[var(--radius-card)] p-5"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-[#c0964f]">
                        {formatLogDate(log.logDate)}
                      </span>
                      <span className="font-mono text-[10px] text-ink-mute">
                        {diaryRelativeTime(log.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {log.labourCount > 0 && (
                        <span className="rounded-[var(--radius-control)] border hairline px-2 py-0.5 font-mono text-[10px] text-ink-mute">
                          {log.labourCount} labour
                        </span>
                      )}
                      {log.weather && (
                        <span className="rounded-[var(--radius-control)] border hairline px-2 py-0.5 font-mono text-[10px] text-ink-mute">
                          {weatherLabel(log.weather)}
                        </span>
                      )}
                      <button
                        aria-label="Edit log"
                        onClick={() => setEditing(log)}
                        className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-control)] text-ink-mute hover:bg-[var(--accent-soft)] hover:text-accent-deep transition-colors"
                      >
                        <IconPencil size={14} />
                      </button>
                      <button
                        aria-label="Delete log"
                        onClick={() => void deleteLog(log.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-control)] text-ink-mute hover:bg-[rgba(179,64,46,0.1)] hover:text-[#b3402e] transition-colors"
                      >
                        <IconTrash size={14} />
                      </button>
                    </div>
                  </div>
                  {log.workDone && (
                    <p className="font-display text-base leading-relaxed">
                      {log.workDone}
                    </p>
                  )}
                  {log.voiceTranscript && (
                    <p className="mt-2 font-display text-sm italic text-[#56605a]">
                      {log.voiceTranscript}
                    </p>
                  )}
                  {photosList.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {photosList.map((src, i) => (
                        <button
                          key={`${src}-${i}`}
                          type="button"
                          onClick={() => setLightbox(src)}
                          className="h-20 w-20 overflow-hidden rounded-[var(--radius-control)] border hairline transition-transform motion-reduce:transition-none hover:scale-[1.03]"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={src}
                            alt={`Site photo ${i + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                  {log.createdBy && (
                    <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-mute">
                      {log.createdBy}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Edit modal */}
      {editing && (
        <EditLogModal
          log={editing}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            const ok = await patchLog(editing.id, patch);
            if (ok) setEditing(null);
          }}
        />
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(10,24,19,0.85)] p-6"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-label="Photo preview"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Site photo preview"
            className="max-h-[85dvh] max-w-full rounded-[var(--radius-control)]"
            onClick={(e) => e.stopPropagation()}
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

function EditLogModal({
  log,
  onClose,
  onSave,
}: {
  log: SiteLogDto;
  onClose: () => void;
  onSave: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const [workDone, setWorkDone] = useState(log.workDone ?? "");
  const [voiceTranscript, setVoiceTranscript] = useState(log.voiceTranscript ?? "");
  const [labourCount, setLabourCount] = useState(String(log.labourCount || ""));
  const [weather, setWeather] = useState(log.weather ?? "sunny");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await onSave({
      work_done: workDone,
      voice_transcript: voiceTranscript,
      labour_count: Number(labourCount) || 0,
      weather,
    });
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(10,24,19,0.55)] p-4" role="dialog" aria-label="Edit site log">
      <form
        onSubmit={(e) => void submit(e)}
        className="surface-elevated w-full max-w-lg space-y-4 rounded-[var(--radius-card)] p-6"
      >
        <div className="flex items-center justify-between">
          <p className="font-display text-xl">Edit log.</p>
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
          <label className={LABEL_CLS}>Work done</label>
          <textarea
            value={workDone}
            onChange={(e) => setWorkDone(e.target.value)}
            rows={3}
            className={INPUT_CLS + " resize-y font-display"}
          />
        </div>
        <div>
          <label className={LABEL_CLS}>Voice transcript</label>
          <textarea
            value={voiceTranscript}
            onChange={(e) => setVoiceTranscript(e.target.value)}
            rows={2}
            className={INPUT_CLS + " resize-y font-display italic text-[#56605a]"}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Labour count</label>
            <input
              type="number"
              min={0}
              value={labourCount}
              onChange={(e) => setLabourCount(e.target.value)}
              className={INPUT_CLS + " font-mono"}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Weather</label>
            <select
              value={weather}
              onChange={(e) => setWeather(e.target.value)}
              className={INPUT_CLS}
            >
              {WEATHER_OPTIONS.map((w) => (
                <option key={w} value={w}>
                  {weatherLabel(w)}
                </option>
              ))}
            </select>
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
