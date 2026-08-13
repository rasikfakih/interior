/**
 * Shared console page header: mono eyebrow rule, display title,
 * mono description, optional trailing action. Server-safe (no hooks).
 * Used by tenant admin editors and superadmin pages alike — both
 * consume the same brand tokens, so one component frames both.
 */
export function AdminPageHeader({
  eyebrow,
  title,
  desc,
  action,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="chrome-pill mb-3 inline-flex">{eyebrow}</p>
        <h1 className="text-3xl tracking-tighter">{title}</h1>
        {desc ? (
          <p className="mt-2 max-w-2xl font-mono text-[10.5px] uppercase tracking-[0.2em] leading-relaxed text-ink-mute">
            {desc}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
