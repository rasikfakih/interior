"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/** SSR-safe prefers-reduced-motion subscription (idiomatic React 18). */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
}

/**
 * Compact 3D preview for the admin console (rooms manager, project
 * form). Lazy-loads the shared three.js runtime only when a model URL
 * is present, so the admin bundle never carries the GLB machinery
 * until it's needed. Previews are operator inspections: trackUsage is
 * off, so they never count as public model_3d_load events.
 */
export default function AdminModelPreview({
  modelUrl,
  label = "Live preview",
}: {
  modelUrl: string;
  label?: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [Mod, setMod] = useState<null | React.ComponentType<{
    modelUrl: string;
    reducedMotion: boolean;
    onReady: () => void;
    trackUsage?: boolean;
  }>>(null);
  // readyUrl / failedUrl are set only from async callbacks, so phase
  // derives cleanly per model URL without sync setState in effects.
  const [readyUrl, setReadyUrl] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!modelUrl) return;
    let cancelled = false;
    import("../three-runtime")
      .then((m) => {
        if (!cancelled) setMod(() => (m as { default: React.ComponentType<{
          modelUrl: string;
          reducedMotion: boolean;
          onReady: () => void;
          trackUsage?: boolean;
        }> }).default);
      })
      .catch(() => {
        if (!cancelled) setFailedUrl(modelUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [modelUrl]);

  const ready = readyUrl === modelUrl;
  const failed = failedUrl === modelUrl;
  const phase = !modelUrl ? "idle" : failed ? "failed" : ready ? "ready" : "loading";

  return (
    <div className="surface-tile overflow-hidden rounded-[var(--radius-card)]">
      <div className="op-panel-head flex items-center justify-between gap-3">
        <span>{label}</span>
        {modelUrl ? (
          <span
            className={`op-dot ${
              failed
                ? "op-dot--bad"
                : ready
                  ? "op-dot--good"
                  : "op-dot--warn"
            }`}
            aria-hidden
          />
        ) : null}
      </div>
      <div className="aspect-video w-full bg-[var(--surface)]">
        {modelUrl && Mod ? (
          <Mod
            key={modelUrl}
            modelUrl={modelUrl}
            reducedMotion={reducedMotion}
            onReady={() => setReadyUrl(modelUrl)}
            trackUsage={false}
          />
        ) : phase === "idle" ? (
          <div className="flex h-full items-center justify-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
              No model URL - add one above to preview
            </p>
          </div>
        ) : phase === "failed" ? (
          <div className="flex h-full items-center justify-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              Could not load this model
            </p>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              Loading viewer…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
