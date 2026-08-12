"use client";

import { useEffect, useState } from "react";
import {
  FormDefinition,
  FormField,
  FIELD_TYPES,
} from "@/lib/forms";

type Toast = { kind: "ok" | "err"; msg: string };
type View =
  | { name: "list" }
  | { name: "editor"; form: FormDefinition | null }
  | { name: "inbox"; form: FormDefinition };

const INPUT_CLS =
  "w-full bg-canvas border hairline rounded-[var(--radius-control)] px-3 py-2 text-sm focus:border-accent focus:outline-none";
const LABEL_CLS = "font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute";

function fmtDate(s: string | null): string {
  if (!s) return "-";
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleString();
  } catch {
    return s;
  }
}

function emptyField(): FormField {
  return { key: "", label: "", type: "text", required: false, options: [] };
}

export default function AdminForms({ role }: { role: string }) {
  const [view, setView] = useState<View>({ name: "list" });
  const [rows, setRows] = useState<FormDefinition[]>([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  function showToast(kind: Toast["kind"], msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2600);
  }

  async function load() {
    setBusy(true);
    try {
      const r = await fetch("/api/forms", { credentials: "include" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast("err", j.error || `Load failed (${r.status})`);
        return;
      }
      setRows(j ?? []);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function del(form: FormDefinition) {
    if (typeof window !== "undefined") {
      const ok = window.confirm(
        `Delete form "${form.title}"? Its submissions are deleted too.`
      );
      if (!ok) return;
    }
    const r = await fetch(`/api/forms/${form.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      showToast("err", j.error || `Delete failed (${r.status})`);
      return;
    }
    showToast("ok", `Deleted ${form.title}`);
    await load();
  }

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-end">
        <div className="md:col-span-8">
          <p className="chrome-pill mb-3 inline-flex">Forms</p>
          <h1 className="text-3xl md:text-5xl tracking-tighter">
            {view.name === "list" && "Form definitions."}
            {view.name === "editor" && "Form editor."}
            {view.name === "inbox" && "Submissions inbox."}
          </h1>
          <p className="text-ink-mute text-sm mt-2">
            {view.name === "list" &&
              "Build forms, drop them on a page with the Form block, and read submissions here."}
            {view.name === "editor" &&
              "Fields render on the public page via /api/forms/submit. Keys are lowercase a-z, digits and underscores."}
            {view.name === "inbox" &&
              "Unread submissions are highlighted. Export pulls a CSV of every row."}
          </p>
        </div>
        <div className="md:col-span-4 flex md:justify-end gap-2">
          {view.name === "inbox" && (
            <button
              type="button"
              onClick={() => setView({ name: "list" })}
              className="btn-ghost"
            >
              Back
            </button>
          )}
          {view.name === "list" && (
            <button
              type="button"
              onClick={() => setView({ name: "editor", form: null })}
              className="btn-primary"
            >
              New form
            </button>
          )}
        </div>
      </header>

      {toast && (
        <div
          role="status"
          className={`surface-elevated px-4 py-3 text-sm rounded-[var(--radius-card)] ${
            toast.kind === "err" ? "text-red-700" : "text-accent"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {view.name === "list" && (
        <FormList
          rows={rows}
          busy={busy}
          role={role}
          onOpen={(f) => setView({ name: "inbox", form: f })}
          onEdit={(f) => setView({ name: "editor", form: f })}
          onDelete={del}
          onChanged={load}
        />
      )}
      {view.name === "editor" && (
        <FormEditor
          form={view.form}
          showToast={showToast}
          onSaved={() => {
            setView({ name: "list" });
            load();
          }}
        />
      )}
      {view.name === "inbox" && (
        <Inbox form={view.form} showToast={showToast} />
      )}
    </div>
  );
}

function FormList({
  rows,
  busy,
  role,
  onOpen,
  onEdit,
  onDelete,
}: {
  rows: FormDefinition[];
  busy: boolean;
  role: string;
  onOpen: (f: FormDefinition) => void;
  onEdit: (f: FormDefinition) => void;
  onDelete: (f: FormDefinition) => void;
  onChanged: () => void;
}) {
  return (
    <div className="space-y-3">
      {rows.length === 0 && !busy && (
        <div className="surface-tile p-8 rounded-[var(--radius-card)]">
          <p className="text-ink-mute text-sm">
            No forms yet. Create your first form, then add the{" "}
            <span className="font-mono text-xs">Form</span> block to a page
            with its slug.
          </p>
        </div>
      )}
      {rows.map((f) => (
        <div
          key={f.id}
          className="surface-tile p-5 rounded-[var(--radius-card)] grid grid-cols-1 md:grid-cols-12 gap-4 items-center"
        >
          <div className="md:col-span-5">
            <p className="text-lg tracking-tight">
              {f.title}{" "}
              <span
                className={`ml-2 font-mono text-[10px] uppercase tracking-[0.22em] ${
                  f.is_published ? "text-accent" : "text-ink-mute"
                }`}
              >
                {f.is_published ? "published" : "draft"}
              </span>
            </p>
            <p className="font-mono text-xs text-ink-mute mt-1">
              /{f.slug} · {f.fields.length} field
              {f.fields.length === 1 ? "" : "s"} · {f.submission_count}{" "}
              submission{f.submission_count === 1 ? "" : "s"}
            </p>
          </div>
          <div className="md:col-span-7 flex flex-wrap gap-2 md:justify-end">
            <button
              type="button"
              onClick={() => onOpen(f)}
              className="btn-primary text-xs h-9 px-3"
            >
              Inbox ({f.submission_count || 0})
            </button>
            <button
              type="button"
              onClick={() => onEdit(f)}
              className="btn-ghost text-xs h-9 px-3"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(f)}
              className="btn-ghost text-xs h-9 px-3"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
      <p className="text-xs text-ink-mute">
        Role: <span className="font-mono text-xs">{role}</span>. Editors can
        view forms; only admins can create or edit definitions.
      </p>
    </div>
  );
}

function FormEditor({
  form,
  showToast,
  onSaved,
}: {
  form: FormDefinition | null;
  showToast: (k: Toast["kind"], m: string) => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(form?.title ?? "");
  const [slug, setSlug] = useState(form?.slug ?? "");
  const [fields, setFields] = useState<FormField[]>(
    form?.fields?.length
      ? form.fields.map((f) => ({ ...f, options: f.options ? [...f.options] : [] }))
      : [emptyField()]
  );
  const [submitLabel, setSubmitLabel] = useState(form?.submit_label ?? "");
  const [successMessage, setSuccessMessage] = useState(
    form?.success_message ?? ""
  );
  const [published, setPublished] = useState(form?.is_published ?? true);
  const [busy, setBusy] = useState(false);

  function updateField(i: number, patch: Partial<FormField>) {
    setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }

  function addField() {
    setFields((prev) => [...prev, emptyField()]);
  }

  function removeField(i: number) {
    setFields((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save() {
    setBusy(true);
    try {
      const body = {
        title,
        slug,
        fields,
        submit_label: submitLabel,
        success_message: successMessage,
        is_published: published,
      };
      const r = form
        ? await fetch(`/api/forms/${form.id}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/forms", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast("err", j.error || `Save failed (${r.status})`);
        return;
      }
      showToast("ok", form ? "Form updated." : "Form created.");
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="surface-tile p-6 rounded-[var(--radius-card)] space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-7">
            <label className={LABEL_CLS}>Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={INPUT_CLS + " mt-1"}
              placeholder="Project enquiry"
            />
          </div>
          <div className="md:col-span-5">
            <label className={LABEL_CLS}>Slug (used by the Form block)</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className={INPUT_CLS + " mt-1"}
              placeholder="project-enquiry"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6">
            <label className={LABEL_CLS}>Submit button label</label>
            <input
              value={submitLabel}
              onChange={(e) => setSubmitLabel(e.target.value)}
              className={INPUT_CLS + " mt-1"}
              placeholder="Send enquiry"
            />
          </div>
          <div className="md:col-span-6 flex items-end">
            <label className="flex items-center gap-2 pb-2">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
              />
              <span className="text-sm">Published (accepts submissions)</span>
            </label>
          </div>
        </div>

        <div>
          <label className={LABEL_CLS}>Success message</label>
          <input
            value={successMessage}
            onChange={(e) => setSuccessMessage(e.target.value)}
            className={INPUT_CLS + " mt-1"}
            placeholder="Thanks - we received your message."
          />
        </div>
      </div>

      <div className="surface-tile p-6 rounded-[var(--radius-card)] space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-base font-medium">Fields</p>
          <button type="button" onClick={addField} className="btn-ghost text-xs h-9 px-3">
            + Add field
          </button>
        </div>
        {fields.map((f, i) => (
          <div
            key={i}
            className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end border-t hairline pt-4"
          >
            <div className="md:col-span-3">
              <label className={LABEL_CLS}>Key</label>
              <input
                value={f.key}
                onChange={(e) => updateField(i, { key: e.target.value })}
                className={INPUT_CLS + " mt-1"}
                placeholder="full_name"
              />
            </div>
            <div className="md:col-span-3">
              <label className={LABEL_CLS}>Label</label>
              <input
                value={f.label}
                onChange={(e) => updateField(i, { label: e.target.value })}
                className={INPUT_CLS + " mt-1"}
                placeholder="Full name"
              />
            </div>
            <div className="md:col-span-2">
              <label className={LABEL_CLS}>Type</label>
              <select
                value={f.type}
                onChange={(e) =>
                  updateField(i, { type: e.target.value as FormField["type"] })
                }
                className={INPUT_CLS + " mt-1"}
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              {f.type === "select" ? (
                <>
                  <label className={LABEL_CLS}>Options (comma separated)</label>
                  <input
                    value={(f.options || []).join(", ")}
                    onChange={(e) =>
                      updateField(i, {
                        options: e.target.value
                          .split(",")
                          .map((o) => o.trim())
                          .filter(Boolean),
                      })
                    }
                    className={INPUT_CLS + " mt-1"}
                    placeholder="Apartment, Villa, Other"
                  />
                </>
              ) : (
                <label className="flex items-center gap-2 pb-2">
                  <input
                    type="checkbox"
                    checked={Boolean(f.required)}
                    onChange={(e) => updateField(i, { required: e.target.checked })}
                  />
                  <span className="text-sm">Required</span>
                </label>
              )}
            </div>
            <div className="md:col-span-1 flex justify-end">
              <button
                type="button"
                onClick={() => removeField(i)}
                className="btn-ghost text-xs h-9 px-3"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="btn-primary disabled:opacity-50"
        >
          {busy ? "Saving..." : form ? "Save changes" : "Create form"}
        </button>
      </div>
    </div>
  );
}

function Inbox({
  form,
  showToast,
}: {
  form: FormDefinition;
  showToast: (k: Toast["kind"], m: string) => void;
}) {
  const [subs, setSubs] = useState<
    { id: number; payload: Record<string, string>; read_at: string | null; created_at: string | null }[]
  >([]);
  const [unread, setUnread] = useState(0);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    try {
      const r = await fetch(`/api/forms/${form.id}/submissions`, {
        credentials: "include",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast("err", j.error || `Load failed (${r.status})`);
        return;
      }
      setSubs(j.submissions ?? []);
      setUnread(j.unread ?? 0);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markAllRead() {
    const r = await fetch(`/api/forms/${form.id}/submissions/read`, {
      method: "POST",
      credentials: "include",
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      showToast("err", j.error || `Mark-read failed (${r.status})`);
      return;
    }
    setUnread(0);
    setSubs((prev) => prev.map((s) => ({ ...s, read_at: s.read_at ?? new Date().toISOString() })));
    showToast("ok", "All submissions marked as read.");
  }

  return (
    <div className="space-y-4">
      <div className="surface-tile p-5 rounded-[var(--radius-card)] flex flex-wrap items-center gap-3">
        <p className="text-sm flex-1">
          <span className="font-mono text-xs text-ink-mute">{form.slug}</span>{" "}
          <span className="text-ink-mute">·</span>{" "}
          <span className={unread > 0 ? "text-accent font-medium" : "text-ink-mute"}>
            {unread} unread
          </span>
        </p>
        <button
          type="button"
          onClick={markAllRead}
          disabled={unread === 0 || busy}
          className="btn-ghost text-xs h-9 px-3 disabled:opacity-40"
        >
          Mark all read
        </button>
        <a
          href={`/api/forms/${form.id}/submissions/export`}
          className="btn-primary text-xs h-9 px-3"
        >
          Export CSV
        </a>
      </div>

      <div className="surface-tile rounded-[var(--radius-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-canvas">
              <tr>
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  id
                </th>
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  submitted
                </th>
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  values
                </th>
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y hairline">
              {subs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-ink-mute">
                    {busy ? "Loading..." : "No submissions yet."}
                  </td>
                </tr>
              )}
              {subs.map((s) => (
                <tr key={s.id} className={s.read_at ? "" : "bg-elev/60"}>
                  <td className="px-4 py-3 font-mono text-xs">{s.id}</td>
                  <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                    {fmtDate(s.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {form.fields.map((f) => (
                        <span key={f.key} className="text-xs">
                          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute mr-1">
                            {f.label}
                          </span>
                          <span className="text-ink break-all">
                            {s.payload[f.key] || "\u2014"}
                          </span>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-mono text-[10px] uppercase tracking-[0.22em] ${
                        s.read_at ? "text-ink-mute" : "text-accent"
                      }`}
                    >
                      {s.read_at ? "read" : "new"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
