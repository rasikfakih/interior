import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { listTenants } from "@/lib/operator-store";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { IconArrowRight } from "@/components/icons";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "Tenants", robots: { index: false } };

export default async function TenantsPage() {
  const cookieStore = await cookies();
  if (cookieStore.get("superadmin_session")?.value !== "1") {
    redirect("/superadmin");
  }

  const rows = await listTenants();

  return (
    <section>
      <AdminPageHeader
        eyebrow="Platform"
        title="Tenants"
        desc="License + distro control across every studio on the platform."
        action={
          <Link href="/superadmin/tenants/new" className="btn-primary h-10 px-5 text-[10px]">
            New tenant
          </Link>
        }
      />

      <div className="op-panel overflow-x-auto">
        <table className="op-table">
          <thead>
            <tr>
              {["ID", "Slug", "Studio", "Owner", "Domain", "Tier", "State", "Expires", ""].map((h) => (
                <th key={h} className="op-th">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="op-td px-4 py-12 text-center text-ink-mute">
                  No tenants yet.
                </td>
              </tr>
            ) : (
              rows.map((t: any) => (
                <tr key={t.id}>
                  <td className="op-td font-mono text-xs text-ink-mute">{t.id}</td>
                  <td className="op-td font-mono text-xs text-ink-mute">{t.slug}</td>
                  <td className="op-td text-sm">{t.studio_name}</td>
                  <td className="op-td text-sm text-ink-mute">{t.owner_email || "—"}</td>
                  <td className="op-td font-mono text-xs text-ink-mute">{t.domain || "—"}</td>
                  <td className="op-td">
                    <span className={`op-chip ${t.tier === "business" ? "op-chip--warn" : ""}`}>
                      {t.tier}
                    </span>
                  </td>
                  <td className="op-td">
                    <span
                      className={`op-chip ${
                        t.state === "active"
                          ? "op-chip--good"
                          : t.state === "revoked" || t.state === "suspended"
                            ? "op-chip--bad"
                            : "op-chip--warn"
                      }`}
                    >
                      {t.state}
                    </span>
                  </td>
                  <td className="op-td font-mono text-xs text-ink-mute">
                    {t.expires_at ? t.expires_at.split("T")[0] : "—"}
                  </td>
                  <td className="op-td text-right">
                    <Link href={`/superadmin/tenants/${t.id}`} className="op-link">
                      Open
                      <IconArrowRight size={13} aria-hidden />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
