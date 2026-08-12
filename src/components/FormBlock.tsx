"use client";

import { useEffect, useState } from "react";
import { FormField, FormFieldType } from "@/lib/forms";
import { IconArrowRight } from "./icons";

type PublicForm = {
  slug: string;
  title: string;
  fields: FormField[];
  submit_label: string | null;
  success_message: string | null;
};

type State = "loading" | "idle" | "submitting" | "success" | "error";

export default function FormBlock({ formSlug }: { formSlug: string }) {
  const [def, setDef] = useState<PublicForm | null>(null);
  const [missing, setMissing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [state, setState] = useState<State>(formSlug ? "loading" : "idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!formSlug) return;
    let alive = true;
    fetch(`/api/forms/public/${encodeURIComponent(formSlug)}`)
      .then(async (r) => {
        if (!alive) return;
        if (r.status === 404) {
          setMissing(true);
          setState("idle");
          return;
        }
        const j = await r.json().catch(() => null);
        if (!alive) return;
        if (!r.ok || !j) {
          setMissing(true);
          setState("idle");
          return;
        }
        setDef(j);
        setState("idle");
      })
      .catch(() => {
        if (!alive) return;
        setMissing(true);
        setState("idle");
      });
    return () => {
      alive = false;
    };
  }, [formSlug]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!def) return;
    setState("submitting");
    setErrorMsg("");
    try {
      const r = await fetch("/api/forms/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: def.slug, values }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        setValues({});
        setState("success");
      } else {
        setState("error");
        setErrorMsg(j.error || "We couldn't send that. Try once more.");
      }
    } catch {
      setState("error");
      setErrorMsg("Network problem. Try a different connection.");
    }
  }

  function renderField(f: FormField) {
    const label = (
      <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
        {f.label}
        {f.required ? " *" : ""}
      </span>
    );
    const cls = "input-line bg-transparent";
    switch (f.type as FormFieldType) {
      case "textarea":
        return (
          <label key={f.key} className="block md:col-span-12">
            {label}
            <textarea
              required={f.required}
              rows={5}
              value={values[f.key] ?? ""}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              className={cls + " resize-none"}
            />
          </label>
        );
      case "select":
        return (
          <label key={f.key} className="block md:col-span-6">
            {label}
            <select
              required={f.required}
              value={values[f.key] ?? ""}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              className={cls}
            >
              <option value="">{f.required ? "Select…" : "Optional"}</option>
              {(f.options || []).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
        );
      default:
        return (
          <label key={f.key} className="block md:col-span-6">
            {label}
            <input
              type={f.type === "email" ? "email" : f.type === "tel" ? "tel" : "text"}
              required={f.required}
              value={values[f.key] ?? ""}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              className={cls}
              autoComplete={f.type === "email" ? "email" : f.type === "tel" ? "tel" : undefined}
            />
          </label>
        );
    }
  }

  if (state === "loading") {
    return (
      <section className="py-16 container-page">
        <p className="text-ink-mute text-sm">Loading form…</p>
      </section>
    );
  }

  if (missing || !def) {
    return (
      <section className="py-16 container-page">
        <p className="text-ink-mute text-sm">
          This form is not published yet. Configure it under Admin → Forms.
        </p>
      </section>
    );
  }

  return (
    <section className="py-16 md:py-24">
      <div className="container-page max-w-3xl">
        {def.title && (
          <h2 className="text-3xl md:text-4xl tracking-tighter mb-8">
            {def.title}
          </h2>
        )}

        {state === "success" ? (
          <div className="surface-elevated p-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink">
              Sent
            </p>
            <p className="text-xl mt-3 text-ink">
              {def.success_message || "Thanks - we received your message."}
            </p>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            noValidate
            className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8"
          >
            {def.fields.map(renderField)}
            <div className="md:col-span-12 flex items-center justify-between flex-wrap gap-4 border-t hairline pt-6">
              <p
                className="text-xs font-mono tracking-[0.04em]"
                style={{ color: state === "error" ? "var(--accent)" : "transparent" }}
                role="alert"
              >
                {errorMsg || "\u00A0"}
              </p>
              <button
                type="submit"
                disabled={state === "submitting"}
                className="btn-primary disabled:opacity-50"
              >
                {state === "submitting" ? "Sending" : def.submit_label || "Send"}
                <IconArrowRight aria-hidden className="inline" />
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
