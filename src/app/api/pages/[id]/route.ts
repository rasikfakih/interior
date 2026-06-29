import { NextRequest, NextResponse } from "next/server";
import { ensureMigrated, pgMany, pgOne, pgQuery } from "@/lib/pg";
import { requireLicense, requireAdminSession } from "@/lib/license-gate";

async function gateOrFail(action: "mutate" | "admin" | "read-public" = "read-public") {
  const g = await requireLicense(action);
  if (!g.ok) return NextResponse.json({ error: g.reason }, { status: g.code });
  return null;
}

async function adminOnlyOrFail() {
  const r = await requireAdminSession();
  if (!r.ok) return r.response;
  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const fail = await gateOrFail("read-public");
    if (fail) return fail;
    const { id } = await params;
    await ensureMigrated();
    const page = await pgOne(`SELECT * FROM pages WHERE id = $1`, [Number(id)]);
    const blocks = await pgMany(
      `SELECT * FROM page_blocks
       WHERE page_id = $1
       ORDER BY order_index ASC, id ASC`,
      [Number(id)]
    );
    if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ page, blocks });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "db error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const fail = await adminOnlyOrFail();
    if (fail) return fail;
    const { id } = await params;
    const d = await req.json();
    await ensureMigrated();

    const updates: string[] = [];
    const args: unknown[] = [];
    let i = 1;
    if (typeof d.title === "string") {
      updates.push(`title = $${i++}`);
      args.push(d.title.slice(0, 200));
    }
    if (typeof d.slug === "string") {
      updates.push(`slug = $${i++}`);
      args.push(d.slug.slice(0, 200));
    }
    if (typeof d.status === "string") {
      updates.push(`status = $${i++}`);
      args.push(d.status.slice(0, 12));
      if (d.status === "published") {
        updates.push(`published_at = $${i++}`);
        args.push(new Date().toISOString());
      } else if (d.status === "draft") {
        updates.push(`published_at = NULL`);
      }
    }
    if (typeof d.seoTitle === "string") {
      updates.push(`seo_title = $${i++}`);
      args.push(d.seoTitle.slice(0, 200));
    }
    if (typeof d.seoDescription === "string") {
      updates.push(`seo_description = $${i++}`);
      args.push(d.seoDescription.slice(0, 500));
    }
    if (typeof d.isFront === "boolean") {
      updates.push(`is_front = $${i++}`);
      args.push(d.isFront);
    }
    if (updates.length === 0) {
      return NextResponse.json({ success: true, noop: true });
    }
    const numericId = Number(id);
    args.push(numericId);
    const r = await pgQuery(
      `UPDATE pages SET ${updates.join(", ")} WHERE id = $${i}`,
      args
    );
    if (!r.rowCount) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const fail = await adminOnlyOrFail();
    if (fail) return fail;
    const { id } = await params;
    const numericId = Number(id);
    await ensureMigrated();
    await pgQuery(`DELETE FROM page_blocks WHERE page_id = $1`, [numericId]);
    const r = await pgQuery(
      `DELETE FROM pages WHERE id = $1`,
      [numericId]
    );
    if (!r.rowCount) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "db error" }, { status: 500 });
  }
}
