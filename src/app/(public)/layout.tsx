import { SaasNav } from "@/components/saas/SaasNav";
import { SaasFooter } from "@/components/saas/SaasFooter";
import LicenseBanner from "@/components/LicenseBanner";
import { resolveTheme, themeVarsStyle } from "@/lib/theme";

export const dynamic = "force-dynamic";

// M1 (2026-08-15): this group is the Studio OS SaaS marketing frame at
// the root. The Etihad Interiors agency frame lives at /demo with its
// own nav, footer, and motion layers (see (demo)/demo/layout.tsx).
export default async function PublicLayout({
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
      <LicenseBanner />
      <SaasNav />
      <main>{children}</main>
      <SaasFooter />
    </>
  );
}
