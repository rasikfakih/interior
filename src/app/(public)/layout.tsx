import { Navbar, type NavLink } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import LicenseBanner from "@/components/LicenseBanner";
import SmoothScroll from "@/components/SmoothScroll";
import GrainOverlay from "@/components/GrainOverlay";
import CursorFollower from "@/components/CursorFollower";
import UsageBeacon from "@/components/UsageBeacon";
import AnnouncementBar from "@/components/AnnouncementBar";
import { resolveTheme, themeVarsStyle } from "@/lib/theme";
import { ensureMigrated, pgMany } from "@/lib/pg";

export const dynamic = "force-dynamic";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Inject the per-tenant theme (v1.7.0). resolveTheme() reads the
  // tenant distro palette from the DB, else studio-brand.json, else
  // defaults. Dark-mode vars are scoped under html.dark so the
  // existing ThemeProvider toggle keeps working.
  let themeStyle = "";
  try {
    themeStyle = themeVarsStyle(await resolveTheme());
  } catch {
    // Keep globals.css defaults if resolution fails.
  }

  // StudioOS Phase 1: nav is DB-driven. Read the primary menu row;
  // fall back to the built-in default list on any failure or empty set.
  let navLinks: NavLink[] | null = null;
  try {
    await ensureMigrated();
    const rows = await pgMany<{
      label: string;
      href: string;
      is_button: number | boolean;
    }>(
      `SELECT mi.label, mi.href, mi.is_button
       FROM menu_items mi
       JOIN menus m ON m.id = mi.menu_id
       WHERE m.location = 'primary'
       ORDER BY mi.order_index ASC, mi.id ASC`
    );
    if (rows.length > 0) {
      navLinks = rows.map((r) => ({
        label: r.label,
        href: r.href,
        is_button: Boolean(r.is_button),
      }));
    }
  } catch {
    navLinks = null;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
      <UsageBeacon />
      <AnnouncementBar />
      <LicenseBanner />
      <SmoothScroll />
      <GrainOverlay />
      <CursorFollower />
      <Navbar navLinks={navLinks ?? undefined} />
      <main>{children}</main>
      <Footer />
    </>
  );
}
