"use client";

export default function GlobalAdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="min-h-[80dvh] flex items-center justify-center px-6">
      <div className="max-w-md">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-4">
          Operator unavailable
        </p>
        <h1 className="text-3xl tracking-tighter">
          The superadmin shell could not render.
        </h1>
        <p className="text-ink-mute mt-4">
          This is usually a missing <code className="font-mono text-xs">SUPERADMIN_EMAIL</code> env
          or a stale deployment. Re-deploy with the canonical env, or sign in from a fresh incognito.
        </p>
        {error?.digest ? (
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
            digest: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex gap-3">
          <button onClick={reset} className="btn-primary">Try again</button>
          <a href="/superadmin" className="btn-ghost">Sign in</a>
        </div>
      </div>
    </section>
  );
}
