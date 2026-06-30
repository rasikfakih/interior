"use client";

import { useState } from "react";
import CalendlyEmbed from "@/components/CalendlyEmbed";

type State = "idle" | "submitting" | "success" | "error";

export default function ContactForm({
  contactEmail,
  contactPhone,
  calendlyUrl,
}: {
  contactEmail: string;
  contactPhone: string;
  calendlyUrl: string;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    projectType: "Apartment",
    message: "",
  });
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    setErrorMsg("");
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          subject: `New project enquiry - ${form.projectType}`,
        }),
      });
      if (r.ok) {
        setState("success");
        setForm({
          name: "",
          email: "",
          phone: "",
          projectType: "Apartment",
          message: "",
        });
      } else {
        setState("error");
        setErrorMsg("We couldn't send that. Try once more.");
      }
    } catch {
      setState("error");
      setErrorMsg("Network problem. Try a different connection.");
    }
  }

  return (
    <section className="pt-24 md:pt-28 pb-24">
      <div className="container-page">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-16">
          <div className="md:col-span-7">
            <p className="chrome-pill mb-6 inline-flex">Contact</p>
            <h1 className="text-[clamp(2.4rem,5.5vw,4.5rem)] tracking-[-0.025em] leading-[1]">
              Start at the kitchen table. We'll bring plans, not catalogues.
            </h1>
          </div>
          <div className="md:col-span-5 md:pt-3 space-y-3 text-ink-mute">
            <p>
              Send a short note. We'll respond the same week with two or three
              questions about the site, the family, and the months ahead.
            </p>
            <p className="font-mono text-xs uppercase tracking-[0.18em]">
              <a href={`mailto:${contactEmail}`} className="hover:text-ink">
                {contactEmail}
              </a>
            </p>
            <p className="font-mono text-xs uppercase tracking-[0.18em]">
              <a
                href={`tel:${contactPhone.replace(/\s+/g, "")}`}
                className="hover:text-ink"
              >
                {contactPhone}
              </a>
            </p>
          </div>
        </div>

        {state === "success" ? (
          <div className="surface-elevated p-10 md:p-14 max-w-3xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink">
              Sent
            </p>
            <h2 className="text-3xl md:text-4xl tracking-tighter mt-3 mb-3">
              Thanks - we'll write back this week.
            </h2>
            <p className="text-ink-mute">
              In the meantime, check the{" "}
              <a
                href="/journal"
                className="underline decoration-1 hairline-strong underline-offset-4 hover:text-ink"
              >
                journal
              </a>{" "}
              for our field notes, or{" "}
              <a
                href="/projects"
                className="underline decoration-1 hairline-strong underline-offset-4 hover:text-ink"
              >
                browse selected work
              </a>
              .
            </p>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 max-w-4xl"
            noValidate
          >
            <div className="md:col-span-6">
              <label className="block">
                <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
                  Name
                </span>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-line"
                  autoComplete="name"
                />
              </label>
            </div>

            <div className="md:col-span-6">
              <label className="block">
                <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
                  Email
                </span>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input-line"
                  autoComplete="email"
                />
              </label>
            </div>

            <div className="md:col-span-6">
              <label className="block">
                <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
                  Phone (optional)
                </span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input-line"
                  autoComplete="tel"
                />
              </label>
            </div>

            <div className="md:col-span-6">
              <label className="block">
                <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
                  Project type
                </span>
                <select
                  value={form.projectType}
                  onChange={(e) =>
                    setForm({ ...form, projectType: e.target.value })
                  }
                  className="input-line bg-transparent"
                >
                  <option>Apartment</option>
                  <option>Villa</option>
                  <option>Coastal home</option>
                  <option>Other</option>
                </select>
              </label>
            </div>

            <div className="md:col-span-12">
              <label className="block">
                <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
                  Tell us about the site and the family
                </span>
                <textarea
                  required
                  rows={5}
                  value={form.message}
                  onChange={(e) =>
                    setForm({ ...form, message: e.target.value })
                  }
                  className="input-line resize-none"
                />
              </label>
            </div>

            <div className="md:col-span-12 sticky bottom-0 -mx-6 md:mx-0 px-6 md:px-0 pt-3 pb-3 md:pb-0 mt-2 flex items-center justify-between flex-wrap gap-4 bg-canvas/95 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none border-t hairline md:border-0">
              <p
                className="text-xs font-mono tracking-[0.04em]"
                style={{
                  color:
                    state === "error" ? "var(--accent)" : "transparent",
                }}
                role="alert"
              >
                {errorMsg || "\u00A0"}
              </p>
              <button
                type="submit"
                disabled={state === "submitting"}
                className="btn-primary disabled:opacity-50"
              >
                {state === "submitting" ? "Sending" : "Send message"}
                <span aria-hidden>→</span>
              </button>
            </div>
          </form>
        )}

        <div className="mt-24">
          <h2 className="text-2xl md:text-3xl tracking-tighter mb-6">
            Or pick a time for a thirty-minute call
          </h2>
          <div className="surface-tile overflow-hidden rounded-[var(--radius-card)]">
            <CalendlyEmbed url={calendlyUrl} />
          </div>
        </div>
      </div>
    </section>
  );
}
