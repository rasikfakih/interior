import { NextRequest, NextResponse } from "next/server";
import { ensureMigrated, pgMany, pgQuery } from "@/lib/pg";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  await ensureMigrated();
  const rows = await pgMany(`SELECT * FROM settings ORDER BY key ASC`);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { key, value } = await req.json();
    if (!key || typeof value !== "string") {
      return NextResponse.json(
        { error: "key and value (string) required" },
        { status: 400 }
      );
    }
    await ensureMigrated();
    const k = String(key).slice(0, 100);
    const v = String(value).slice(0, 2000);
    const r = await pgQuery(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
       RETURNING *`,
      [k, v]
    );
    return NextResponse.json({ success: true, item: r.rows?.[0] ?? null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
