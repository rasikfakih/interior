"use client";

import { Suspense, useEffect, useRef, useState } from "react";

interface Model3DViewerProps {
  modelUrl: string;
  posterUrl?: string;
  compact?: boolean;
}

export default function Model3DViewer({
  modelUrl,
  posterUrl,
  compact = false,
}: Model3DViewerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [shouldMount, setShouldMount] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      setShouldMount(true);
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReducedMotion(reduce);

    if (reduce) {
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
      { threshold: 0.18, rootMargin: "100px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const height = compact ? "h-[320px]" : "h-[500px]";

  return (
    <div ref={ref} className={`w-full ${height} relative`}>
      {posterUrl && !shouldMount && (
        <img
          src={posterUrl}
          alt="Project spatial preview"
          className="absolute inset-0 w-full h-full object-cover rounded-[var(--radius-card)]"
          loading="lazy"
        />
      )}

      {loading && shouldMount && (
        <div className="absolute inset-0 flex items-center justify-center bg-elev rounded-[var(--radius-card)]">
          <div className="animate-spin h-10 w-10 border-t-2 border-b-2 border-warm rounded-full" />
        </div>
      )}

      {shouldMount && (
        <LazyCanvas
          modelUrl={modelUrl}
          posterUrl={posterUrl}
          reducedMotion={reducedMotion}
          onReady={() => setLoading(false)}
        />
      )}
    </div>
  );
}

function LazyCanvas({
  modelUrl,
  posterUrl,
  reducedMotion,
  onReady,
}: {
  modelUrl: string;
  posterUrl?: string;
  reducedMotion: boolean;
  onReady: () => void;
}) {
  const [Mod, setMod] = useState<any>(null);
  useEffect(() => {
    let cancelled = false;
    import("./three-runtime")
      .then((m) => {
        if (!cancelled) setMod(() => m.default);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  if (!Mod) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-xs font-mono uppercase tracking-[0.22em] text-ink-mute">
        Loading viewer…
      </div>
    );
  }
  return (
    <Mod
      modelUrl={modelUrl}
      posterUrl={posterUrl}
      reducedMotion={reducedMotion}
      onReady={onReady}
    />
  );
}
