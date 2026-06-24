import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { requireLicense } from "@/lib/license-gate";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { openDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    const gate = await requireLicense("admin");
    if (!gate.ok) {
      return NextResponse.json({ error: gate.reason, code: gate.code }, { status: gate.code });
    }
    const url = new URL(req.url);
    const kind = url.searchParams.get("kind");
    const sqlite = openDb();
    const rows = kind
      ? sqlite
          .prepare(
            `SELECT id, kind, message, meta, created_at FROM audit_log WHERE kind LIKE ? ORDER BY id DESC LIMIT 100`
          )
          .all(`${kind}%`)
      : sqlite
          .prepare(
            `SELECT id, kind, message, meta, created_at FROM audit_log ORDER BY id DESC LIMIT 100`
          )
          .all();
    sqlite.close();
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "db error" }, { status: 500 });
  }
}
