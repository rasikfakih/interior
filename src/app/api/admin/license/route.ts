import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { readLicense, appendAudit } from "@/lib/license";
import { requireLicense } from "@/lib/license-gate";
import path from "path";

async function isAuthorized() {
  try {
    const session = await getServerSession(authOptions);
    return Boolean((session?.user as any)?.id);
  } catch {
    return false;
  }
}

export async function GET() {
  try {
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
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "license error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const gate = await requireLicense("admin");
    if (!gate.ok) {
      return NextResponse.json({ error: gate.reason, code: gate.code }, { status: gate.code });
    }
    if (!(await isAuthorized())) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
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
    const fsSync = await import("fs");
    const file = process.env.VERCEL
      ? "/tmp/license.json"
      : path.join(process.cwd(), "data", "license.json");
    const dir = path.dirname(file);
    if (!fsSync.existsSync(dir)) fsSync.mkdirSync(dir, { recursive: true });
    await fs.writeFile(file, JSON.stringify(license, null, 2), "utf8");
    await appendAudit(
      "license.reinstalled",
      `License re-installed on ${license.domain}, tier=${license.tier}`
    );
    return NextResponse.json({ success: true, license });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "license error" }, { status: 500 });
  }
}
