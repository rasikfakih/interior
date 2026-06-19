import { NextResponse } from "next/server";
import { requireLicense } from "@/lib/license-gate";

export async function GET() {
  // public read of license is informative; do not gate
  const gate = await requireLicense("read-public");
  if (!gate.ok && gate.code !== 401) {
    return NextResponse.json({ error: gate.reason }, { status: gate.code });
  }
  const { readLicense } = await import("@/lib/license");
  return NextResponse.json({
    license: readLicense(),
    server: process.env.LICENSE_SERVER_URL || null,
  });
}

export async function POST() {
  const gate = await requireLicense("admin");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: gate.code });
  }
  return NextResponse.json(
    { error: "POST /api/license is for first-install. Use /api/admin/license or /install" },
    { status: 405 }
  );
}
