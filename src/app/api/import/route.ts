import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { importTenantContent, CONTENT_FORMAT, CONTENT_VERSION } from "@/lib/content-export";
import { appendAudit } from "@/lib/license";
import { bump } from "@/lib/revalidate";

/**
 * POST /api/import - restore tenant content from an export envelope.
 * Admin/superadmin only (an editor must not be able to wipe content).
 * Replace-all within a transaction; the audit trail records what
 * landed so a mistaken import is diagnosable.
 */
export async function POST(req: Request) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;
  if (gate.role === "editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = await importTenantContent(raw);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await appendAudit("content.import", "full content import applied", {
    tables: result.tables,
  });
  bump({ kind: "pages" });
  bump({ kind: "projects" });

  return NextResponse.json({ ok: true, tables: result.tables });
}

export const dynamic = "force-dynamic";
