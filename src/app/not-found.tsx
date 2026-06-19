import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <section className="min-h-[80dvh] flex items-center">
      <div className="container-page grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
        <div className="md:col-span-9">
          <p className="chrome-pill mb-6 inline-flex">404</p>
          <h1 className="text-[clamp(3rem,10vw,8rem)] tracking-[-0.03em] leading-[0.9]">
            Nothing here.{" "}
            <em className="text-warm not-italic font-medium">Yet.</em>
          </h1>
          <p className="text-ink-mute mt-6 max-w-[58ch] text-base md:text-lg leading-relaxed">
            The page you tried to reach is no longer at this address. It may
            have moved, been retired, or never existed.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/" className="btn-primary">
              Back to home
            </Link>
            <Link href="/projects" className="btn-ghost">
              Selected work
            </Link>
          </div>
        </div>
        <div className="md:col-span-3 md:text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            Lost?
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-warm mt-1">
            Mail us
          </p>
          <a
            href="mailto:studio@etihadinteriors.com"
            className="block text-sm mt-2 hover:text-warm"
          >
            studio@etihadinteriors.com
          </a>
        </div>
      </div>
    </section>
  );
}
