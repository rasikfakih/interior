import { NextRequest, NextResponse } from "next/server";
import { ensureMigrated, pgQuery } from "@/lib/pg";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || !(email as string).includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }
    await ensureMigrated();
    const r = await pgQuery(
      `INSERT INTO newsletter_subscribers (email) VALUES ($1)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [String(email).trim().toLowerCase()]
    );
    if (!r.rowCount) {
      return NextResponse.json({ message: "Already subscribed!" });
    }
    return NextResponse.json({ message: "Successfully subscribed!" });
  } catch (e) {
    return NextResponse.json({ error: "Subscription failed" }, { status: 500 });
  }
}
