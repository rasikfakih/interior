"use client";

export default function AdminError({
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
          Dashboard unavailable
        </p>
        <h1 className="text-3xl tracking-tighter">
          The admin shell could not finish rendering.
        </h1>
        <p className="text-ink-mute mt-4">
          This is usually a license or session issue. Try signing in again, or
          re-stamp the license at <code className="font-mono text-xs">/install</code>.
        </p>
        {error?.digest ? (
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
            digest: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex gap-3">
          <button onClick={reset} className="btn-primary">Try again</button>
          <a href="/" className="btn-ghost">View site</a>
        </div>
      </div>
    </section>
  );
}
