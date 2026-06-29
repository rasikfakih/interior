type CheckResult =
  | { ok: true; license: any }
  | { ok: false; reason: string };

const reasonText: Record<string, string> = {
  missing: "This template is unlicensed.",
  expired: "This license has expired.",
  "domain-mismatch": "License not bound to this domain.",
  tampered: "License file has been tampered with.",
  "no-signature": "License signature is missing.",
};

export default function SafeLicenseBanner({ check }: { check: CheckResult }) {
  if (check.ok) return null;
  return (
    <div
      role="alert"
      className="bg-elev border-b hairline-strong"
      style={{ position: "sticky", top: 0, zIndex: "var(--z-nav)" }}
    >
      <div className="container-page py-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink mr-3">
            {reasonText[check.reason] || "License issue"}
          </span>
          <a className="underline decoration-1 hairline-strong underline-offset-4" href="/admin/license">
            Restore license at /admin/license
          </a>
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
          Public reads remain open
        </p>
      </div>
    </div>
  );
}
