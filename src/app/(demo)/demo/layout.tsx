import { Navbar, type NavLink } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import LicenseBanner from "@/components/LicenseBanner";
import SmoothScroll from "@/components/SmoothScroll";
import GrainOverlay from "@/components/GrainOverlay";
import CursorFollower from "@/components/CursorFollower";
import { resolveTheme, themeVarsStyle } from "@/lib/theme";
import Link from "next/link";

export const dynamic = "force-dynamic";

// M1 (2026-08-15): this is the Etihad Interiors agency frame under
// /demo - the living showcase of what a Studio OS tenant looks like.
// The nav is deterministic (not DB-driven) so the demo always reads
// the same, and a persistent "Powered by Studio OS" strip hooks back
// to the SaaS marketing site at /.
const AGENCY_LINKS: NavLink[] = [
  { href: "/demo/work", label: "Selected work" },
  { href: "/demo/about", label: "Studio" },
  { href: "/demo/journal", label: "Journal" },
  { href: "/demo/voices", label: "Voices" },
  { href: "/demo/contact", label: "Contact" },
];

export default async function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let themeStyle = "";
  try {
    themeStyle = themeVarsStyle(await resolveTheme());
  } catch {
    // Keep globals.css defaults if resolution fails.
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
      <Link
        href="/"
        className="block bg-[#122A20] text-[#ECECE6]"
      >
        <span className="container-page flex items-center justify-center gap-2 py-2 font-mono text-[10px] uppercase tracking-[0.22em]">
          This demo agency runs on Studio OS
          <span className="text-[#C0964F]">Get Studio OS</span>
        </span>
      </Link>
      <LicenseBanner />
      <SmoothScroll />
      <GrainOverlay />
      <CursorFollower />
      <Navbar navLinks={AGENCY_LINKS} homeHref="/demo" />
      <main>{children}</main>
      <Footer />
    </>
  );
}
