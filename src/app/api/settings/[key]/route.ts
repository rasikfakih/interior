import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { appendAudit } from "@/lib/license";
import { ensureMigrated, pgOne, pgQuery } from "@/lib/pg";
import {
  isWhitelisted,
  getWhitelistEntry,
  validateValue,
} from "@/lib/settings-whitelist";
import { bump } from "@/lib/revalidate";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const gate = await requireAdminSession();
  if (!gate.ok) return new NextResponse(gate.response.body, gate.response);
  const { key } = await params;
  const k = decodeURIComponent(key).slice(0, 100);
  if (!isWhitelisted(k)) {
    return NextResponse.json(
      { error: "Not whitelisted", key: k },
      { status: 404 }
    );
  }
  await ensureMigrated();
  const row = await pgOne(`SELECT * FROM settings WHERE key = $1 LIMIT 1`, [k]);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const gate = await requireAdminSession();
  if (!gate.ok) return new NextResponse(gate.response.body, gate.response);
  const { key } = await params;
  const k = decodeURIComponent(key).slice(0, 100);
  if (!isWhitelisted(k)) {
    return NextResponse.json(
      {
        error:
          "Key is not in the editable whitelist. Add it to SETTINGS_WHITELIST first.",
        key: k,
      },
      { status: 400 }
    );
  }
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body.value !== "string") {
      return NextResponse.json(
        { error: "value (string) required" },
        { status: 400 }
      );
    }
    const entry = getWhitelistEntry(k);
    if (entry) {
      const v = validateValue(entry, body.value);
      if (!v.ok) {
        return NextResponse.json(
          { error: v.reason, key: k, kind: entry.kind },
          { status: 400 }
        );
      }
    }
    const v = String(body.value).slice(0, 2000);
    await ensureMigrated();
    const r = await pgQuery(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
       RETURNING *`,
      [k, v]
    );
    const row = r.rows?.[0] ?? null;
    await appendAudit("settings.update", `settings key "${k}" updated`, {
      key: k,
      valueLen: v.length,
      role: gate.role,
    });
    bump({ kind: "settings" });
    return NextResponse.json({ success: true, item: row });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const gate = await requireAdminSession();
  if (!gate.ok) return new NextResponse(gate.response.body, gate.response);
  const { key } = await params;
  const k = decodeURIComponent(key).slice(0, 100);
  if (!isWhitelisted(k)) {
    return NextResponse.json(
      { error: "Key is not in the editable whitelist.", key: k },
      { status: 404 }
    );
  }
  await ensureMigrated();
  await pgQuery(`DELETE FROM settings WHERE key = $1`, [k]);
  await appendAudit("settings.delete", `settings key "${k}" deleted`, {
    key: k,
    role: gate.role,
  });
  bump({ kind: "settings" });
  return NextResponse.json({ success: true });
}
