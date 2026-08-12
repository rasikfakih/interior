"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Phase 5: usage beacon. Fires one fire-and-forget POST to
 * /api/usage/record per pageview so the superadmin metrics page can
 * show per-path / per-tenant pageviews without server-side middleware.
 * Skipped for bots, reduced-motion is irrelevant (no visuals), and a
 * failed record is silently dropped.
 */
export default function UsageBeacon() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (/bot|crawler|spider|preview|headless/i.test(navigator.userAgent || "")) {
      return;
    }
    const path = first.current ? pathname : pathname;
    first.current = false;
    const host = window.location.host;
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 3000);
    fetch("/api/usage/record", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path, host }),
      signal: ctl.signal,
      keepalive: true,
    }).catch(() => {});
    return () => clearTimeout(t);
  }, [pathname]);

  return null;
}
