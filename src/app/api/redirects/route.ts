import { NextRequest, NextResponse } from "next/server";
import { ensureMigrated, pgMany, pgOne } from "@/lib/pg";
import { requireAdminSession } from "@/lib/license-gate";

/** Normalize a redirect source to `/path` with no trailing slash. */
export function normalizeSource(source: string): string {
  let s = String(source ?? "").trim();
  if (!s.startsWith("/")) s = "/" + s;
  // Strip query + fragment before normalization.
  s = s.split(/[?#]/)[0];
  s = s.replace(/\/+$/, "");
  return s || "/";
}

export function normalizeDestination(destination: string): string {
  const d = String(destination ?? "").trim();
  if (!d) return "";
  if (d.startsWith("http://") || d.startsWith("https://") || d.startsWith("/") || d.startsWith("#")) {
    return d;
  }
  return "/" + d;
}

function rowToDto(row: Record<string, unknown>) {
  return {
    id: row.id,
    source: row.source,
    destination: row.destination,
    status_code: Number(row.status_code ?? 301),
    is_active: row.is_active === 1 || row.is_active === true,
  };
}

export async function GET() {
  await ensureMigrated();
  const rows = await pgMany(
    `SELECT * FROM redirects ORDER BY source ASC`
  );
  return NextResponse.json(rows.map(rowToDto));
}

export async function POST(req: NextRequest) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  try {
    const d = await req.json();
    const source = normalizeSource(d.source);
    const destination = normalizeDestination(d.destination);
    if (source === "/") {
      return NextResponse.json(
        { error: "The site root cannot be redirected." },
        { status: 400 }
      );
    }
    if (!destination) {
      return NextResponse.json(
        { error: "destination is required" },
        { status: 400 }
      );
    }
    const status = d.status_code === 302 ? 302 : 301;
    await ensureMigrated();
    const clash = await pgOne(
      `SELECT id FROM redirects WHERE source = $1 LIMIT 1`,
      [source]
    );
    if (clash) {
      return NextResponse.json(
        { error: `A redirect for "${source}" already exists.` },
        { status: 409 }
      );
    }
    const inserted = await pgOne(
      `INSERT INTO redirects (source, destination, status_code, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [source, destination, status, d.is_active !== false]
    );
    if (!inserted) {
      return NextResponse.json({ error: "Insert failed" }, { status: 400 });
    }
    return NextResponse.json({ success: true, item: rowToDto(inserted) }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: msg || "Create failed" },
      { status: 400 }
    );
  }
}
