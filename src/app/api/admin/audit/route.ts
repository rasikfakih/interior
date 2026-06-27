import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { requireLicense } from "@/lib/license-gate";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ensureMigrated, pgMany } from "@/lib/pg";

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
    await ensureMigrated();
    const rows = kind
      ? await pgMany(
          `SELECT id, kind, message, meta, created_at FROM audit_log
           WHERE kind LIKE $1 ORDER BY id DESC LIMIT 100`,
          [`${kind}%`]
        )
      : await pgMany(
          `SELECT id, kind, message, meta, created_at FROM audit_log
           ORDER BY id DESC LIMIT 100`
        );
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "db error" }, { status: 500 });
  }
}
