import SafeLicenseBanner from "@/components/LicenseBannerClient";
import { checkLicense } from "@/lib/license";

export default async function LicenseBanner() {
  let check;
  try {
    check = await checkLicense();
  } catch {
    check = { ok: false as const, reason: "missing" as const };
  }
  return <SafeLicenseBanner check={check} />;
}
