import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { requireLicense } from "@/lib/license-gate";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

async function gate() {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const g = await requireLicense("admin");
  if (!g.ok) return NextResponse.json({ error: g.reason }, { status: g.code });
  return null;
}

export async function GET() {
  const fail = await gate();
  if (fail) return fail;
  const a = await fetch(
    process.env.NEXTAUTH_URL
      ? `${process.env.NEXTAUTH_URL}/api/pages`
      : `http://localhost:${process.env.PORT || 3000}/api/pages`,
    { cache: "no-store" }
  ).catch(() => null);
  if (a && a.ok) {
    return NextResponse.json(await a.json());
  }
  const { db } = await import("@/lib/db");
  const rows = await db.select().from(await import("@/lib/schema").then((m) => m.pages));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const fail = await gate();
  if (fail) return fail;
  const d = await req.json();
  const base = process.env.NEXTAUTH_URL
    ? process.env.NEXTAUTH_URL
    : `http://localhost:${process.env.PORT || 3000}`;
  const r = await fetch(`${base}/api/pages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(d),
  });
  const j = await r.json().catch(() => ({}));
  return NextResponse.json({ status: r.status, ...j });
}
