import { getSiteSettings } from "@/lib/settings";
import ContactForm from "./ContactForm";

export const metadata = {
  title: "Contact",
  description: "Start at the kitchen table. We'll bring plans, not catalogues.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ContactPage() {
  const settings = await getSiteSettings();
  return (
    <ContactForm
      contactEmail={settings.contact_email}
      contactPhone={settings.contact_phone}
      calendlyUrl={settings.calendly_url}
    />
  );
}
