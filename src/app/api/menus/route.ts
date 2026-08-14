import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { appendAudit } from "@/lib/license";
import { ensureMigrated, pgMany, pgOne } from "@/lib/pg";
import { bump } from "@/lib/revalidate";
import { withPgTx } from "@/lib/pg";

/**
 * /api/menus - DB-driven primary navigation (StudioOS Phase 1).
 *
 * The Navbar renders whatever the primary menu row holds; this API is
 * the admin editor surface. Menus/menu_items tables existed since
 * v1.1.0 but were never read (Navbar was hardcoded). GET returns the
 * ordered primary items; PUT replaces them in one transaction.
 *
 * Auth: requireAdminSession (admin + superadmin both edit).
 */

const DEFAULT_ITEMS = [
  { label: "Selected work", href: "/projects-v2", is_button: false },
  { label: "Studio", href: "/about", is_button: false },
  { label: "Journal", href: "/journal", is_button: false },
  { label: "Contact", href: "/contact", is_button: false },
];

type MenuItem = {
  id?: number;
  label: string;
  href: string;
  is_button?: boolean;
};

function shapeItem(row: {
  id: number;
  label: string;
  href: string;
  target: string | null;
  is_button: number | boolean;
}) {
  return {
    id: row.id,
    label: row.label,
    href: row.href,
    target: row.target,
    is_button: Boolean(row.is_button),
  };
}

export async function GET() {
  const gate = await requireAdminSession();
  if (!gate.ok) {
    return new NextResponse(gate.response.body, gate.response);
  }
  await ensureMigrated();
  const menu = await pgOne<{ id: number }>(
    `SELECT id FROM menus WHERE location = 'primary' ORDER BY id ASC LIMIT 1`
  );
  if (!menu) {
    return NextResponse.json({ items: DEFAULT_ITEMS });
  }
  const rows = await pgMany<{
    id: number;
    label: string;
    href: string;
    target: string | null;
    is_button: number | boolean;
  }>(
    `SELECT id, label, href, target, is_button
     FROM menu_items WHERE menu_id = $1
     ORDER BY order_index ASC, id ASC`,
    [menu.id]
  );
  const items = (rows ?? []).map(shapeItem);
  return NextResponse.json({ items: items.length ? items : DEFAULT_ITEMS });
}

export async function PUT(req: NextRequest) {
  const gate = await requireAdminSession();
  if (!gate.ok) {
    return new NextResponse(gate.response.body, gate.response);
  }

  let body: { items?: unknown } = {};
  try {
    body = (await req.json()) as { items?: unknown };
  } catch {
    return NextResponse.json({ error: "JSON body required" }, { status: 400 });
  }
  const rawItems = Array.isArray(body.items) ? body.items : null;
  if (!rawItems) {
    return NextResponse.json({ error: "items array required" }, { status: 400 });
  }
  if (rawItems.length > 12) {
    return NextResponse.json({ error: "Max 12 nav items" }, { status: 400 });
  }

  const items: MenuItem[] = [];
  for (const it of rawItems) {
    if (!it || typeof it !== "object") {
      return NextResponse.json({ error: "Each item must be an object" }, { status: 400 });
    }
    const label = String((it as { label?: unknown }).label ?? "").trim().slice(0, 80);
    const href = String((it as { href?: unknown }).href ?? "").trim().slice(0, 240);
    const is_button = Boolean((it as { is_button?: unknown }).is_button);
    if (!label || !href) {
      return NextResponse.json(
        { error: "Each item needs a non-empty label and href" },
        { status: 400 }
      );
    }
    if (!href.startsWith("/") && !href.startsWith("http")) {
      return NextResponse.json(
        { error: `href must be internal (/path) or absolute (http): ${href}` },
        { status: 400 }
      );
    }
    items.push({ label, href, is_button });
  }

  await ensureMigrated();

  const saved = await withPgTx(async (client) => {
    const menu = await client.query<{ id: number }>(
      `SELECT id FROM menus WHERE location = 'primary' ORDER BY id ASC LIMIT 1`
    );
    let menuId = menu.rows[0]?.id;
    if (menuId == null) {
      const ins = await client.query<{ id: number }>(
        `INSERT INTO menus (location) VALUES ('primary') RETURNING id`
      );
      menuId = ins.rows[0]?.id;
    }
    await client.query(`DELETE FROM menu_items WHERE menu_id = $1`, [menuId]);
    for (let i = 0; i < items.length; i++) {
      await client.query(
        `INSERT INTO menu_items (menu_id, label, href, target, order_index, is_button)
         VALUES ($1, $2, $3, NULL, $4, $5)`,
        [menuId, items[i].label, items[i].href, i, items[i].is_button ? 1 : 0]
      );
    }
    const rows = await client.query<{
      id: number;
      label: string;
      href: string;
      target: string | null;
      is_button: number | boolean;
    }>(
      `SELECT id, label, href, target, is_button
       FROM menu_items WHERE menu_id = $1
       ORDER BY order_index ASC, id ASC`,
      [menuId]
    );
    return rows.rows.map(shapeItem);
  });

  await appendAudit("menu.update", "primary navigation updated", {
    items: saved.map((s) => s.label),
    role: gate.role,
  });
  bump({ kind: "pages" });

  return NextResponse.json({ success: true, items: saved });
}
