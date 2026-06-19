import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { readLicense } from "@/lib/license";
import { requireLicense } from "@/lib/license-gate";
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "etihad.db");

async function isAuthorized() {
  const session = await getServerSession(authOptions);
  return Boolean((session?.user as any)?.id);
}

export async function GET() {
  const gate = await requireLicense("admin");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason, code: gate.code }, { status: gate.code });
  }
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const license = readLicense();
  return NextResponse.json({
    license,
    server: process.env.LICENSE_SERVER_URL || null,
  });
}

export async function POST(req: NextRequest) {
  const auth = await isAuthorized();
  if (!auth) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const gate = await requireLicense("admin");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason, code: gate.code }, { status: gate.code });
  }
  const { signLicense } = await import("@/lib/license-key.test");
  const d = await req.json();
  if (!d.purchaseCode || !d.domain || !d.tier)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const expiresAt =
    d.expiresAt || new Date(Date.now() + 365 * 86400e3).toISOString();
  const body = {
    purchaseCode: String(d.purchaseCode).slice(0, 80),
    domain: String(d.domain).slice(0, 200),
    tier: d.tier,
    installedAt: new Date().toISOString(),
    expiresAt,
    features:
      d.features ||
      (d.tier === "business"
        ? {
            "feature.3d-viewer": true,
            "feature.multilingual": true,
            "feature.unlimited-pages": true,
            "feature.unlimited-media": true,
            "feature.multi-domain": true,
          }
        : {
            "feature.3d-viewer": false,
            "feature.multilingual": false,
            "feature.unlimited-pages": false,
            "feature.unlimited-media": false,
            "feature.multi-domain": false,
          }),
    signature: "",
    issuedBy: "offline-hmac",
  } as any;
  const sig = signLicense(body);
  const license = { ...body, signature: sig };
  const fs = await import("fs/promises");
  const file = path.join(process.cwd(), "data", "license.json");
  await fs.writeFile(file, JSON.stringify(license, null, 2), "utf8");
  try {
    const sqlite = new Database(DB_PATH);
    sqlite
      .prepare(
        `INSERT INTO audit_log (kind, message) VALUES ('license.reinstalled', ?)`
      )
      .run(`License re-installed on ${license.domain}, tier=${license.tier}`);
    sqlite.close();
  } catch {}
  return NextResponse.json({ success: true, license });
}
