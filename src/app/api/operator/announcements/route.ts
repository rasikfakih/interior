import { NextResponse } from "next/server";
import { getOperatorSession } from "@/lib/operator-auth";
import { listAnnouncements, createAnnouncement } from "@/lib/operator-store";

export async function GET() {
  const ok = await getOperatorSession();
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, items: await listAnnouncements() });
}

export async function POST(req: Request) {
  const ok = await getOperatorSession();
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const bodyText = typeof body.body === "string" ? body.body.trim() : "";
  if (!title || !bodyText) {
    return NextResponse.json({ error: "title and body required" }, { status: 400 });
  }
  const audience = ["all", "admin", "public"].includes(body.audience)
    ? (body.audience as string)
    : "all";
  const id = await createAnnouncement({
    title: title.slice(0, 255),
    body: bodyText.slice(0, 2000),
    audience,
    is_active: body.is_active !== false,
  });
  return NextResponse.json({ ok: true, id });
}
