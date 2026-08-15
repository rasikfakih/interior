import { NextRequest, NextResponse } from "next/server";
import { ensureMigrated, withPgTx } from "@/lib/pg";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Public contact-enquiry submit (the marketing contact page at
 * /contact). The enquiry lands in the lead pipeline with
 * source='website' so the public page feeds the same funnel as the
 * forms builder. The message text has no lead column today, so it is
 * logged for the operator; the lead row carries name / email / phone.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown> | undefined;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const name = str(body?.name);
  const email = str(body?.email);
  const phone = str(body?.phone);
  const message = str(body?.message);

  if (!name && !email && !phone) {
    return NextResponse.json(
      { error: "name, email or phone is required." },
      { status: 400 }
    );
  }
  const leadName = name || email || phone || "Website enquiry";

  try {
    await ensureMigrated();
    // One transaction: the lead insert is the whole unit of work, so a
    // failed write can never leave a half-acknowledged enquiry.
    const inserted = await withPgTx(async (client) => {
      const res = await client.query(
        `INSERT INTO leads (name, phone, email, source, status, score)
         VALUES ($1, $2, $3, 'website', 'new', 0)
         RETURNING id`,
        [leadName, phone || null, email || null]
      );
      return res.rows?.[0];
    });
    if (!inserted) {
      return NextResponse.json({ error: "Enquiry failed" }, { status: 400 });
    }
    if (message) {
      // Free text has no lead column; keep it visible to the operator
      // without duplicating the identity fields now persisted in DB.
      console.log(`[contact] ${name || email || phone}: ${message.slice(0, 500)}`);
    }
    return NextResponse.json({
      success: true,
      message: "Thank you for your message. We will contact you soon.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: msg || "Enquiry failed" },
      { status: 400 }
    );
  }
}
