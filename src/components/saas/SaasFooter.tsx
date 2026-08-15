import Link from "next/link";

export function SaasFooter() {
  return (
    <footer className="border-t hairline bg-canvas">
      <div className="container-page py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-5">
            <p className="font-hero text-2xl tracking-tight">Studio OS</p>
            <p className="text-ink-mute mt-3 max-w-[42ch] text-sm leading-relaxed">
              The operating system for interior studios. Leads, proposals,
              boards, BOQ with live material costs, an offline site diary,
              and a client portal - one console from first call to handover.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/admin"
                className="inline-flex items-center rounded-lg bg-[#C0964F] px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[#122A20] dark:text-[#122A20] hover:bg-[#D2B06A] transition-colors"
              >
                Get started
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center rounded-lg border border-[var(--ink)] px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
              >
                See the demo
              </Link>
            </div>
          </div>

          <div className="md:col-span-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-4">
              Product
            </p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/#features" className="hover:text-ink">Features</Link></li>
              <li><Link href="/#pricing" className="hover:text-ink">Pricing</Link></li>
              <li><Link href="/admin" className="hover:text-ink">Console</Link></li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-4">
              See it live
            </p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/demo/work" className="hover:text-ink">A demo agency - selected work</Link></li>
              <li><Link href="/demo/voices" className="hover:text-ink">Client voices</Link></li>
              <li><Link href="/demo/journal" className="hover:text-ink">Studio journal</Link></li>
              <li><Link href="/demo/contact" className="hover:text-ink">Talk to the demo studio</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-6 border-t hairline flex flex-col md:flex-row gap-3 justify-between text-xs font-mono uppercase tracking-[0.16em] text-ink-mute">
          <p>© {new Date().getFullYear()} Studio OS</p>
          <p>Built in Kalyan, Maharashtra</p>
        </div>
      </div>
    </footer>
  );
}
