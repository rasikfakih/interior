import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { resolveAdminTenantId } from "@/lib/theme";
import { ensureMigrated, pgMany, pgOne } from "@/lib/pg";
import {
  BOQ_ITEM_SELECT,
  mapBoqItem,
  mapBoqVersion,
  normalizeBoqStatus,
  type BoqVersionDto,
} from "@/lib/boq";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ versionId: string }> };

async function loadVersionItems(versionId: string) {
  return pgMany<Record<string, unknown>>(
    `${BOQ_ITEM_SELECT} WHERE bi.boq_version_id = $1 ORDER BY bi.created_at ASC`,
    [versionId]
  );
}

export async function GET(_req: NextRequest, { params }: Params) {
  const gate = await requireAdminSession();
  if (!gate.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }
  const { versionId } = await params;

  await ensureMigrated();
  const version = await pgOne<Record<string, unknown>>(
    `SELECT * FROM boq_versions WHERE id = $1 LIMIT 1`,
    [versionId]
  );
  if (!version) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (Number(version.tenant_id) !== tenantId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const itemRows = await loadVersionItems(versionId);
  const dto: BoqVersionDto = {
    ...mapBoqVersion(version),
    items: itemRows.map((r) => mapBoqItem(r)),
  };
  return NextResponse.json({ version: dto });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const gate = await requireAdminSession();
  if (!gate.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }
  const { versionId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  await ensureMigrated();
  const version = await pgOne<{ tenant_id: number }>(
    `SELECT tenant_id FROM boq_versions WHERE id = $1 LIMIT 1`,
    [versionId]
  );
  if (!version) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (version.tenant_id !== tenantId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const sets: string[] = [];
  const args: unknown[] = [];
  const push = (sql: string, value: unknown) => {
    args.push(value);
    sets.push(sql.replace("$n", `$${args.length}`));
  };

  if (body.title !== undefined) {
    push("title = $n", String(body.title).trim() || "BOQ");
  }
  if (body.notes !== undefined) {
    push("notes = $n", body.notes === null ? null : String(body.notes));
  }
  if (body.status !== undefined) {
    const status = normalizeBoqStatus(body.status);
    if (!status) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    push("status = $n", status);
  }
  if (sets.length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  args.push(versionId);
  await pgMany(
    `UPDATE boq_versions SET ${sets.join(", ")}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${args.length}`,
    args
  );

  const row = await pgOne<Record<string, unknown>>(
    `SELECT * FROM boq_versions WHERE id = $1 LIMIT 1`,
    [versionId]
  );
  const itemRows = await loadVersionItems(versionId);
  const dto: BoqVersionDto | null = row
    ? { ...mapBoqVersion(row), items: itemRows.map((r) => mapBoqItem(r)) }
    : null;
  return NextResponse.json({ version: dto });
}
