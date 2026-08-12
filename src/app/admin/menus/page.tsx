import AdminMenus from "@/components/admin/AdminMenus";
import { requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated, pgMany, pgOne } from "@/lib/pg";

export const metadata = {
  title: "Menus",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const DEFAULT_ITEMS = [
  { label: "Selected work", href: "/projects-v2", is_button: false },
  { label: "Studio", href: "/about", is_button: false },
  { label: "Journal", href: "/journal", is_button: false },
  { label: "Contact", href: "/contact", is_button: false },
];

export default async function AdminMenusPage() {
  const gate = await requireAdminSession();
  if (!gate.ok) {
    return (
      <section className="pt-24 md:pt-28 pb-24">
        <div className="container-page">
          <p className="surface-elevated px-4 py-3 text-sm rounded-[var(--radius-card)]">
            Sign in is required to edit the menu.
          </p>
        </div>
      </section>
    );
  }

  await ensureMigrated();
  const menu = await pgOne<{ id: number }>(
    `SELECT id FROM menus WHERE location = 'primary' ORDER BY id ASC LIMIT 1`
  );
  let items = DEFAULT_ITEMS;
  if (menu) {
    const rows = await pgMany<{
      label: string;
      href: string;
      is_button: number | boolean;
    }>(
      `SELECT label, href, is_button
       FROM menu_items WHERE menu_id = $1
       ORDER BY order_index ASC, id ASC`,
      [menu.id]
    );
    if (rows.length > 0) {
      items = rows.map((r) => ({
        label: r.label,
        href: r.href,
        is_button: Boolean(r.is_button),
      }));
    }
  }

  return (
    <section className="pt-24 md:pt-28 pb-24">
      <div className="container-page">
        <AdminMenus initial={items} role={gate.role} />
      </div>
    </section>
  );
}
