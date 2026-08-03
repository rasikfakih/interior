import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import LicenseBanner from "@/components/LicenseBanner";
import SmoothScroll from "@/components/SmoothScroll";
import GrainOverlay from "@/components/GrainOverlay";
import CursorFollower from "@/components/CursorFollower";
import { resolveTheme, themeVarsStyle } from "@/lib/theme";

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

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
      <LicenseBanner />
      <SmoothScroll />
      <GrainOverlay />
      <CursorFollower />
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}
