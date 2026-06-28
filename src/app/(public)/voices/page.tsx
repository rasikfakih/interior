import type { Metadata } from "next";
import Link from "next/link";
import VoicesServer from "@/components/VoicesServer";
import StudioServer from "@/components/StudioServer";

export const metadata: Metadata = {
  title: "Voices & Studio",
  description:
    "Three voices from clients. The studio team that draws, specifies, and supervises on-site.",
};

export default function VoicesPage() {
  return (
    <section className="pt-24 md:pt-28 pb-24">
      <div className="container-page">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-16">
          <div className="md:col-span-7">
            <p className="chrome-pill mb-6 inline-flex">Voices and Studio</p>
            <h1 className="text-[clamp(2.4rem,6vw,5rem)] tracking-[-0.025em] leading-[1]">
              <em className="text-accent not-italic font-medium">Words and hands.</em>
            </h1>
          </div>
          <div className="md:col-span-5 md:pt-3">
            <p className="text-ink-mute">
              The homeowner's view, then the studio that built it. Edits
              live in <Link href="/admin/testimonials" className="text-warm border-b border-[var(--accent-warm-soft)]">/admin/testimonials</Link> and
              {" "}<Link href="/admin/team" className="text-warm border-b border-[var(--accent-warm-soft)]">/admin/team</Link>.
            </p>
          </div>
        </div>
        <VoicesServer />
        <StudioServer />
      </div>
    </section>
  );
}
