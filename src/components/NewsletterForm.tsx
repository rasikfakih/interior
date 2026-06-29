"use client";

import { useState } from "react";

type State = "idle" | "submitting" | "success" | "error" | "duplicate";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setState("error");
      setMessage("Please enter a valid email.");
      return;
    }
    setState("submitting");
    try {
      const r = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (r.ok) {
        const data = await r.json();
        if (data.message?.toLowerCase().includes("already")) {
          setState("duplicate");
          setMessage("You're already on the list.");
        } else {
          setState("success");
          setMessage("Subscribed. The first letter arrives soon.");
        }
        setEmail("");
      } else {
        setState("error");
        setMessage("Couldn't subscribe. Try again later.");
      }
    } catch {
      setState("error");
      setMessage("Network error. Try again.");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md"
      aria-label="Newsletter sign-up"
    >
      <div className="flex items-end gap-3">
        <label className="flex-1">
          <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
            Email
          </span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@studio"
            className="input-line"
            disabled={state === "submitting"}
            required
          />
        </label>
        <button
          type="submit"
          disabled={state === "submitting"}
          className="btn-primary disabled:opacity-50"
        >
          {state === "submitting" ? "Sending" : "Subscribe"}
        </button>
      </div>
      <p
        className="mt-3 text-xs font-mono tracking-[0.04em] min-h-[1.25rem]"
        style={{
          color:
            state === "error"
              ? "var(--accent)"
              : state === "success" || state === "duplicate"
              ? "var(--accent)"
              : "var(--ink-mute)",
        }}
        role="status"
        aria-live="polite"
      >
        {message || "Two letters a year. Unsubscribe at any time."}
      </p>
    </form>
  );
}
