import type { Metadata } from "next";
import InstallForm from "./InstallForm";
import { checkLicense } from "@/lib/license";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Install license",
  robots: { index: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function InstallPage() {
  const check = await checkLicense();
  if (check.ok) redirect("/admin");

  return (
    <section className="pt-24 md:pt-28 pb-24 max-md:min-h-[88dvh] flex items-center">
      <div className="container-page max-w-3xl">
        <p className="chrome-pill mb-6 inline-flex">First install</p>
        <h1 className="text-[clamp(2.2rem,5vw,3.5rem)] tracking-tighter leading-[1.05] mb-3">
          Activate your Envato purchase.
        </h1>
        <p className="text-ink-mute mb-10 max-w-[60ch]">
          Enter your Envato purchase code and the domain this build will live on.
          We'll stamp a signed license into <code className="font-mono text-xs">/data/license.json</code>.
          Public pages keep working even without a license - admin and 3D gated until reactivated.
        </p>
        <InstallForm />
      </div>
    </section>
  );
}
