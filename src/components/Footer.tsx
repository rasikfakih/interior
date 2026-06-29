import Link from "next/link";
import { getSiteSettings } from "@/lib/settings";
import NewsletterForm from "./NewsletterForm";

export const Footer = async () => {
  const settings = await getSiteSettings();
  const currentYear = new Date().getFullYear();
  const addressLines = settings.studio_address
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <footer className="border-t hairline">
      <div className="container-page py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-5">
            <h3 className="text-3xl md:text-4xl tracking-tighter leading-tight">
              Studio notes from Kalyan, every other month.
            </h3>
            <p className="text-ink-mute mt-3 max-w-[42ch]">
              One short letter. Field notes and material reads. No promotions.
            </p>
            <div className="mt-6">
              <NewsletterForm />
            </div>
          </div>

          <div className="md:col-span-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-4">
              Studio
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/projects" className="hover:text-ink">
                  Selected work
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-ink">
                  About the studio
                </Link>
              </li>
              <li>
                <Link href="/journal" className="hover:text-ink">
                  Journal
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-ink">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-4">
              Visit
            </p>
            <address className="not-italic text-sm space-y-1 text-ink-mute">
              <p className="text-ink">Etihad Interiors</p>
              {addressLines.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
              <p className="pt-2 text-ink">
                <a
                  href={`mailto:${settings.contact_email}`}
                  className="hover:text-ink"
                >
                  {settings.contact_email}
                </a>
              </p>
              <p className="text-ink">
                <a
                  href={`tel:${settings.contact_phone.replace(/\s+/g, "")}`}
                  className="hover:text-ink"
                >
                  {settings.contact_phone}
                </a>
              </p>
            </address>

            <div className="mt-6 flex gap-4 text-sm">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer noopener"
                className="hover:text-ink"
              >
                Instagram â†—
              </a>
              <a
                href="https://www.are.na"
                target="_blank"
                rel="noreferrer noopener"
                className="hover:text-ink"
              >
                Are.na â†—
              </a>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-6 border-t hairline flex flex-col md:flex-row gap-3 justify-between text-xs font-mono uppercase tracking-[0.16em] text-ink-mute">
          <p>Â© {currentYear} Etihad Interiors Â· All rights reserved</p>
          <p>Designed + built in Kalyan, Maharashtra</p>
        </div>
      </div>
    </footer>
  );
};
