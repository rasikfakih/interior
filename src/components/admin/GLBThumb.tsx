"use client";

import { type ReactElement, useEffect, useRef, useState } from "react";

interface GLBThumbProps {
  modelUrl: string;
  posterUrl?: string | null;
  alt: string;
}

const RUNTIME_PROMPT = "Open";

/**
 * Compact GLB thumbnail for the admin MediaGrid. Lazy-loads the
 * three.js runtime only when the tile enters the viewport AND
 * the operator clicks "Open". Without a `modelUrl` it renders
 * the poster thumbnail only.
 *
 * Reduced-motion is honored by passing reducedMotion=true to
 * the three.js runtime, which disables OrbitControls autoRotate.
 */
export default function GLBThumb({ modelUrl, posterUrl, alt }: GLBThumbProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shouldMount, setShouldMount] = useState(false);
  const [fallbackOpen, setFallbackOpen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShouldMount(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldMount(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "120px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="absolute inset-0"
      role="img"
      aria-label={alt}
    >
      {posterUrl && (
        <img
          src={posterUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          aria-hidden="true"
        />
      )}
      {!fallbackOpen && modelUrl && (
        <button
          type="button"
          onClick={() => setFallbackOpen(true)}
          className="absolute inset-0 flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.22em] text-white/85"
          aria-label={`${RUNTIME_PROMPT} ${alt}`}
        >
          <span className="bg-black/45 px-3 py-2">{RUNTIME_PROMPT}</span>
        </button>
      )}
      {fallbackOpen && modelUrl && shouldMount && (
        <LazyThree
          modelUrl={modelUrl}
          posterUrl={posterUrl}
        />
      )}
    </div>
  );
}

function LazyThree({
  modelUrl,
  posterUrl,
}: {
  modelUrl: string;
  posterUrl?: string | null;
}) {
  const [Mod, setMod] = useState<null | ((p: {
    modelUrl: string;
    posterUrl?: string | null;
    reducedMotion: boolean;
    onReady: () => void;
  }) => React.ReactElement)>(null);
  useEffect(() => {
    let cancelled = false;
    import("../three-runtime")
      .then((m) => {
        if (!cancelled) setMod(() => (m as { default: any }).default);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  if (!Mod) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-xs font-mono uppercase tracking-[0.22em] text-white/85 bg-black/30">
        <span className="bg-black/55 px-3 py-2">Loading viewer</span>
      </div>
    );
  }
  const Three = Mod;
  return (
    <Three
      modelUrl={modelUrl}
      posterUrl={posterUrl ?? undefined}
      reducedMotion={true}
      onReady={() => {}}
    />
  );
}
