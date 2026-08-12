"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";

/**
 * Magnetic - draws the wrapped element toward the cursor while the
 * pointer is over it (max `strength` px), snapping back on leave.
 *
 * Desktop-only by design: only `pointer: fine` devices get the pull,
 * and `prefers-reduced-motion` disables it entirely so the element
 * stays inert. Pure decoration - it never affects the click target
 * (the child is the real control).
 */
export default function Magnetic({
  children,
  strength = 10,
  className = "",
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof window === "undefined") return;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (!fine || reduce) return;

    const xTo = gsap.quickTo(node, "x", {
      duration: 0.45,
      ease: "power3.out",
    });
    const yTo = gsap.quickTo(node, "y", {
      duration: 0.45,
      ease: "power3.out",
    });

    const onMove = (e: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist === 0) return;
      const pull = Math.min(1, dist / 140);
      xTo(dx * 0.14 * pull * (strength / 10));
      yTo(dy * 0.14 * pull * (strength / 10));
    };

    const onLeave = () => {
      xTo(0);
      yTo(0);
    };

    node.addEventListener("pointermove", onMove);
    node.addEventListener("pointerleave", onLeave);
    return () => {
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerleave", onLeave);
    };
  }, [strength]);

  return (
    <span
      ref={ref}
      className={"inline-block will-change-transform " + className}
      style={{ display: "inline-flex" }}
    >
      {children}
    </span>
  );
}
