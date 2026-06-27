import { NextResponse } from "next/server";
import crypto from "crypto";
import { createTenant } from "@/lib/operator-store";

/**
 * Envato purchase webhook.
 * Verify the HMAC signature from Envato, then create a PENDING_TENANT row.
 * No license is issued here - operator approves from /superadmin/tenants/[id].
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-envato-signature");
  const secret = process.env.ENVATO_WEBHOOK_SECRET || "";

  if (secret) {
    if (!signature) {
      return NextResponse.json({ error: "missing signature" }, { status: 401 });
    }
    const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
    if (!timingSafeHexEq(expected, signature)) {
      return NextResponse.json({ error: "bad signature" }, { status: 401 });
    }
  }

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const purchaseCode = (payload.purchase_code || payload.code || "").toString().trim();
  const buyerEmail = (payload.buyer_email || payload.email || "").toString().trim();
  const studioName = (payload.studio_name || payload.item_name || `Envato install ${Date.now()}`).toString().trim();

  if (!purchaseCode || !buyerEmail) {
    return NextResponse.json({ error: "purchase_code and buyer_email required" }, { status: 400 });
  }

  const slug = `envato-${purchaseCode.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").slice(0, 48)}`;
  const tier = (payload.tier || "personal").toLowerCase() === "business" ? "business" : "personal";

  try {
    const id = await createTenant({ slug, studio_name: studioName, owner_email: buyerEmail, tier });
    return NextResponse.json({ ok: true, tenant_id: id, slug, state: "pending" });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}

function timingSafeHexEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}
