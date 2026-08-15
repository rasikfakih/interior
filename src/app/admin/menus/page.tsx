import AdminMenus from "@/components/admin/AdminMenus";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated, pgMany, pgOne } from "@/lib/pg";
import { getAdminIdentity } from "../identity";

export const metadata = {
  title: "Menus",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const DEFAULT_ITEMS = [
  { label: "Selected work", href: "/projects", is_button: false },
  { label: "Studio", href: "/about", is_button: false },
  { label: "Journal", href: "/journal", is_button: false },
  { label: "Contact", href: "/contact", is_button: false },
];

export default async function AdminMenusPage() {
  const gate = await requireAdminSession();
  const { email, role } = await getAdminIdentity();
  if (!gate.ok) {
    return (
      <AdminPageShell email={email} role={role}>
        <p className="surface-elevated px-4 py-3 text-sm rounded-[var(--radius-card)]">
          Sign in is required to edit the menu.
        </p>
      </AdminPageShell>
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
    <AdminPageShell email={email} role={gate.role}>
      <AdminMenus initial={items} role={gate.role} />
    </AdminPageShell>
  );
}
