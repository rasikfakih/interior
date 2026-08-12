import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ensureMigrated, pgMany, pgOne } from "@/lib/pg";
import { requireAdminSession } from "@/lib/license-gate";

export const ROLES = ["admin", "editor", "superadmin"] as const;
export type TenantRole = (typeof ROLES)[number];

function rowToDto(row: Record<string, unknown>) {
  return {
    id: row.id,
    email: row.email,
    role: row.role || "admin",
    is_active: row.is_active === 1 || row.is_active === true || row.is_active === null,
    tenant_id: row.tenant_id,
    created_at: row.created_at,
  };
}

/**
 * Tenant user management. Both admin and superadmin may manage
 * users; editors are content-only and get 403.
 */
export async function GET() {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;
  if (gate.role === "editor") {
    return NextResponse.json(
      { error: "Editors cannot manage users." },
      { status: 403 }
    );
  }
  await ensureMigrated();
  const rows = await pgMany(
    `SELECT id, email, role, is_active, tenant_id, created_at
     FROM users ORDER BY id ASC`
  );
  return NextResponse.json(rows.map(rowToDto));
}

export async function POST(req: NextRequest) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;
  if (gate.role === "editor") {
    return NextResponse.json(
      { error: "Editors cannot manage users." },
      { status: 403 }
    );
  }

  try {
    const d = await req.json();
    const email = String(d.email ?? "").trim().toLowerCase();
    const password = String(d.password ?? "");
    const role = String(d.role ?? "editor");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }
    if (!ROLES.includes(role as TenantRole)) {
      return NextResponse.json({ error: "Unknown role." }, { status: 400 });
    }
    if (role === "superadmin" && gate.role !== "superadmin") {
      return NextResponse.json(
        { error: "Only superadmins can create superadmin accounts." },
        { status: 403 }
      );
    }
    await ensureMigrated();
    const existing = await pgOne(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );
    if (existing) {
      return NextResponse.json(
        { error: "A user with that email already exists." },
        { status: 409 }
      );
    }
    const hash = bcrypt.hashSync(password, 10);
    const inserted = await pgOne(
      `INSERT INTO users (email, password_hash, role, is_active, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING id, email, role, is_active, tenant_id, created_at`,
      [email, hash, role, true]
    );
    if (!inserted) {
      return NextResponse.json({ error: "Insert failed" }, { status: 400 });
    }
    return NextResponse.json({ success: true, item: rowToDto(inserted) }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: msg || "Create failed" },
      { status: 400 }
    );
  }
}
