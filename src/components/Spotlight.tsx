"use client";

import { useRef } from "react";

/**
 * Spotlight - a cursor-tracked radial glow for card hover trails.
 *
 * Renders a zero-size pointer-tracking layer inside a card; on
 * pointermove it writes --spot-x / --spot-y onto the PARENT card so
 * the CSS glow (`.ei-spot .ei-spot-glow`) follows the cursor. The
 * parent card must carry the `ei-spot` class. Pure decoration:
 * reduced-motion hides the glow via CSS and the layer never blocks
 * clicks (pointer-events-none on the glow; the tracker itself is
 * transparent and non-interactive beyond tracking).
 */
export default function Spotlight() {
  const ref = useRef<HTMLDivElement | null>(null);

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    parent.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    parent.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[1]"
    >
      <div className="ei-spot-glow absolute inset-0" />
    </div>
  );
}
