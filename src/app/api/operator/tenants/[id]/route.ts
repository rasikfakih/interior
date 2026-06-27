import { NextResponse } from "next/server";
import { getOperatorSession } from "@/lib/operator-auth";
import { getTenant, updateTenant, revokeTenant, applyDistro, signLicense } from "@/lib/operator-store";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ok = await getOperatorSession();
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  return NextResponse.json({ ok: true, ...(await getTenant(numericId)) });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ok = await getOperatorSession();
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));
  if (body.distro && typeof body.distro === "object") {
    await applyDistro(numericId, body.distro);
  }
  const tPatch: Record<string, any> = {};
  for (const k of ["studio_name", "owner_email", "domain", "tier", "state", "expires_at"]) {
    if (body[k] !== undefined) tPatch[k] = body[k];
  }
  if (Object.keys(tPatch).length > 0) await updateTenant(numericId, tPatch);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ok = await getOperatorSession();
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const url = new URL(req.url);
  if (url.searchParams.get("revoke") === "1") {
    await revokeTenant(numericId, "manual");
    return NextResponse.json({ ok: true, revoked: true });
  }
  return NextResponse.json({ error: "pass ?revoke=1 to revoke" }, { status: 400 });
}
