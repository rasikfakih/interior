import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ensureMigrated, pgOne, pgQuery } from "@/lib/pg";

async function isAuthorized() {
  const session = await getServerSession(authOptions);
  return Boolean((session?.user as any)?.id);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const d = await req.json();
    const updates: string[] = [];
    const args: unknown[] = [];
    let i = 1;
    if (typeof d.name === "string") { updates.push(`name = $${i++}`); args.push(d.name.slice(0, 160)); }
    if (typeof d.role === "string") { updates.push(`role = $${i++}`); args.push(d.role.slice(0, 160)); }
    if (typeof d.quote === "string") { updates.push(`quote = $${i++}`); args.push(d.quote.slice(0, 2000)); }
    if (typeof d.photo === "string") { updates.push(`photo = $${i++}`); args.push(d.photo.slice(0, 500)); }
    if (typeof d.isPublished === "boolean") { updates.push(`is_published = $${i++}`); args.push(d.isPublished); }
    if (updates.length === 0) return NextResponse.json({ success: true, noop: true });
    const numericId = Number(id);
    args.push(numericId);
    const q = await pgQuery(
      `UPDATE testimonials SET ${updates.join(", ")} WHERE id = $${i} RETURNING *`,
      args
    );
    const row = q.rows?.[0];
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, item: row });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await ensureMigrated();
  await pgQuery(`DELETE FROM testimonials WHERE id = $1`, [Number(id)]);
  return NextResponse.json({ success: true });
}
