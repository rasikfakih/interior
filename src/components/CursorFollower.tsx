"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

export default function CursorFollower() {
  const ring = useRef<HTMLDivElement | null>(null);
  const dot = useRef<HTMLDivElement | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;
    setEnabled(true);

    const ringEl = ring.current;
    const dotEl = dot.current;
    if (!ringEl || !dotEl) return;

    gsap.set(ringEl, { xPercent: -50, yPercent: -50, x: -100, y: -100, opacity: 0 });
    gsap.set(dotEl, { xPercent: -50, yPercent: -50, x: -100, y: -100, opacity: 0 });

    const xTo = gsap.quickTo(ringEl, "x", { duration: 0.5, ease: "power3.out" });
    const yTo = gsap.quickTo(ringEl, "y", { duration: 0.5, ease: "power3.out" });
    const dxTo = gsap.quickTo(dotEl, "x", { duration: 0.18, ease: "power3.out" });
    const dyTo = gsap.quickTo(dotEl, "y", { duration: 0.18, ease: "power3.out" });

    const onMove = (e: MouseEvent) => {
      xTo(e.clientX);
      yTo(e.clientY);
      dxTo(e.clientX);
      dyTo(e.clientY);
      gsap.to([ringEl, dotEl], { opacity: 1, duration: 0.2, overwrite: "auto" });
    };
    const onLeave = () =>
      gsap.to([ringEl, dotEl], { opacity: 0, duration: 0.25, overwrite: "auto" });

    const onHoverTarget = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const hot =
        t.closest("a, button, [data-cursor='hover']") !== null;
      gsap.to(ringEl, {
        scale: hot ? 1.6 : 1,
        backgroundColor: hot ? "var(--accent)" : "transparent",
        duration: 0.3,
        overwrite: "auto",
      });
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onHoverTarget);
    window.addEventListener("mouseout", (e) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const hot = t.closest("a, button, [data-cursor='hover']");
      if (hot) {
        gsap.to(ringEl, {
          scale: 1,
          backgroundColor: "transparent",
          duration: 0.3,
          overwrite: "auto",
        });
      }
    });
    document.body.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onHoverTarget);
      document.body.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={ring}
        aria-hidden
        className="fixed top-0 left-0 w-9 h-9 rounded-full pointer-events-none z-[90] border hairline-strong"
        style={{ mixBlendMode: "difference" }}
      />
      <div
        ref={dot}
        aria-hidden
        className="fixed top-0 left-0 w-1 h-1 rounded-full pointer-events-none z-[90]"
        style={{ background: "var(--ink)" }}
      />
    </>
  );
}
