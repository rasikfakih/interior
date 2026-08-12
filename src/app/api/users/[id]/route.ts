import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ensureMigrated, pgOne } from "@/lib/pg";
import { requireAdminSession } from "@/lib/license-gate";
import { ROLES, TenantRole } from "@/app/api/users/route";

type Ctx = { params: Promise<{ id: string }> };

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

async function getSelf(gate: { role: string }, id: string): Promise<string | null> {
  const { getServerSession } = await import("next-auth/next");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  return String(userId ?? "") === id ? gate.role : null;
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;
  if (gate.role === "editor") {
    return NextResponse.json(
      { error: "Editors cannot manage users." },
      { status: 403 }
    );
  }

  const { id } = await ctx.params;
  await ensureMigrated();
  const row = await pgOne(
    `SELECT * FROM users WHERE id = $1 LIMIT 1`,
    [Number(id)]
  );
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const selfRole = await getSelf(gate, id);

  try {
    const d = await req.json();
    const nextRole = d.role !== undefined ? String(d.role) : row.role;
    if (d.role !== undefined && !ROLES.includes(nextRole as TenantRole)) {
      return NextResponse.json({ error: "Unknown role." }, { status: 400 });
    }
    const nextActive =
      d.is_active !== undefined ? Boolean(d.is_active) : Boolean(row.is_active);

    // Self-protection: never demote or deactivate your own account.
    if (selfRole !== null) {
      if (d.role !== undefined && nextRole !== row.role && selfRole === "admin") {
        return NextResponse.json(
          { error: "You cannot change your own role." },
          { status: 403 }
        );
      }
      if (d.is_active !== undefined && !nextActive) {
        return NextResponse.json(
          { error: "You cannot deactivate your own account." },
          { status: 403 }
        );
      }
    }
    // Only a superadmin may alter a superadmin account.
    if (row.role === "superadmin" && gate.role !== "superadmin") {
      return NextResponse.json(
        { error: "Only superadmins can modify superadmin accounts." },
        { status: 403 }
      );
    }
    if (nextRole === "superadmin" && gate.role !== "superadmin") {
      return NextResponse.json(
        { error: "Only superadmins can grant the superadmin role." },
        { status: 403 }
      );
    }

    let hash: string | null = null;
    if (d.password !== undefined && d.password !== "") {
      if (String(d.password).length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters." },
          { status: 400 }
        );
      }
      hash = bcrypt.hashSync(String(d.password), 10);
    }

    const updated = await pgOne(
      `UPDATE users
       SET role = $1, is_active = $2${hash ? `, password_hash = $3` : ""}
       WHERE id = ${hash ? "$4" : "$3"}
       RETURNING id, email, role, is_active, tenant_id, created_at`,
      hash
        ? [nextRole, nextActive, hash, Number(id)]
        : [nextRole, nextActive, Number(id)]
    );
    if (!updated) {
      return NextResponse.json({ error: "Update failed" }, { status: 400 });
    }
    return NextResponse.json({ success: true, item: rowToDto(updated) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: msg || "Update failed" },
      { status: 400 }
    );
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;
  if (gate.role === "editor") {
    return NextResponse.json(
      { error: "Editors cannot manage users." },
      { status: 403 }
    );
  }

  const { id } = await ctx.params;
  await ensureMigrated();
  const row = await pgOne(
    `SELECT * FROM users WHERE id = $1 LIMIT 1`,
    [Number(id)]
  );
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const selfRole = await getSelf(gate, id);
  if (selfRole !== null) {
    return NextResponse.json(
      { error: "You cannot delete your own account." },
      { status: 403 }
    );
  }
  if (row.role === "superadmin" && gate.role !== "superadmin") {
    return NextResponse.json(
      { error: "Only superadmins can delete superadmin accounts." },
      { status: 403 }
    );
  }
  await pgOne(`DELETE FROM users WHERE id = $1`, [Number(id)]);
  return NextResponse.json({ success: true });
}
