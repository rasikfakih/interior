import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { listTenants } from "@/lib/operator-store";
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
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl tracking-tight text-zinc-900">Tenants</h1>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
            License + distro control
          </p>
        </div>
        <Link
          href="/superadmin/tenants/new"
          className="border border-zinc-300 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-700 hover:border-zinc-700 hover:text-zinc-900"
        >
          New tenant
        </Link>
      </div>

      <div className="overflow-x-auto border border-zinc-200 bg-white">
        <table className="w-full text-left">
          <thead className="border-b border-zinc-200 bg-zinc-50">
            <tr>
              {["ID", "Slug", "Studio", "Owner", "Domain", "Tier", "State", "Expires", ""].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-sm text-zinc-500">
                  No tenants yet.
                </td>
              </tr>
            ) : (
              rows.map((t: any) => (
                <tr key={t.id} className="border-b border-zinc-100 last:border-b-0">
                  <td className="px-4 py-3 font-mono text-xs text-zinc-700">{t.id}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-700">{t.slug}</td>
                  <td className="px-4 py-3 text-sm text-zinc-900">{t.studio_name}</td>
                  <td className="px-4 py-3 text-sm text-zinc-700">{t.owner_email || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-700">{t.domain || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="border border-zinc-300 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-700">
                      {t.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="border border-zinc-300 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-700">
                      {t.state}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-700">
                    {t.expires_at ? t.expires_at.split("T")[0] : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/superadmin/tenants/${t.id}`}
                      className="font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-700 hover:text-zinc-900"
                    >
                      Open <span aria-hidden="true">{'->'}</span>
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
