import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@/lib/schema";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const rows = await db.select().from(settings);
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
    const inserted = await db
      .insert(settings)
      .values({
        key: String(key).slice(0, 100),
        value: String(value).slice(0, 2000),
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: String(value).slice(0, 2000) },
      })
      .returning();
    return NextResponse.json({ success: true, item: inserted[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
