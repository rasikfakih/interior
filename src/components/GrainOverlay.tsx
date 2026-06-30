"use client";

import { useEffect, useState } from "react";

export default function GrainOverlay() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fineHover = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    );
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setEnabled(fineHover.matches && !reduce.matches);
    sync();
    fineHover.addEventListener("change", sync);
    reduce.addEventListener("change", sync);
    return () => {
      fineHover.removeEventListener("change", sync);
      reduce.removeEventListener("change", sync);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: "var(--z-grain)" }}
    >
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.04] mix-blend-multiply dark:mix-blend-screen"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="grain-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain-noise)" />
      </svg>
    </div>
  );
}
