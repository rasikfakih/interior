import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { requireLicense } from "@/lib/license-gate";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "etihad.db");

export async function GET(req: NextRequest) {
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
  const sqlite = new Database(DB_PATH);
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
}
