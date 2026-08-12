import { NextResponse } from "next/server";
import { getOperatorSession } from "@/lib/operator-auth";
import { updateAnnouncement, deleteAnnouncement } from "@/lib/operator-store";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ok = await getOperatorSession();
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));
  const patch: { title?: string; body?: string; audience?: string; is_active?: boolean } = {};
  if (typeof body.title === "string") patch.title = body.title.trim().slice(0, 255);
  if (typeof body.body === "string") patch.body = body.body.trim().slice(0, 2000);
  if (typeof body.audience === "string" && ["all", "admin", "public"].includes(body.audience)) {
    patch.audience = body.audience;
  }
  if (typeof body.is_active === "boolean") patch.is_active = body.is_active;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }
  try {
    await updateAnnouncement(numericId, patch);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ok = await getOperatorSession();
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  try {
    await deleteAnnouncement(numericId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}
