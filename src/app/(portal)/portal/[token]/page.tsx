import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { fetchPortalData, type PortalPayload } from "@/lib/portal";
import ClientPortal from "@/components/portal/ClientPortal";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { params: Promise<{ token: string }> };

/**
 * The portal page tracks a view on every render (portal_access_count).
 * generateMetadata reads with track=false so a single load counts once.
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { token } = await params;
  if (!/^[A-Za-z0-9]{8,12}$/.test(token)) return {};
  const data = await fetchPortalData(token, { track: false });
  if (!data) return {};
  return {
    title: `${data.project.name} - ${data.brand.name}`,
    description: `Live project updates for ${data.project.clientName ?? data.project.name}.`,
  };
}

export default async function PortalPage({ params }: Params) {
  const { token } = await params;
  if (!/^[A-Za-z0-9]{8,12}$/.test(token)) notFound();

  const host = (await headers()).get("host");
  const data = await fetchPortalData(token, { track: true, host });
  if (!data) notFound();

  return (
    <ClientPortal
      token={token}
      initial={data}
      host={host}
    />
  );
}

// Re-exported so the client component can refresh after an approve /
// comment round-trip without losing the type.
export type { PortalPayload };
