import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated, pgOne, withPgTx } from "@/lib/pg";
import { resolveAdminTenantId } from "@/lib/theme";
import {
  generateProposalToken,
  proposalDto,
} from "@/lib/proposals";

/**
 * Admin: create a proposal for a client project and mint its public
 * share token. The proposal starts in status 'sent'; a project still
 * in 'draft' advances to 'design'. Token collisions retry a few times.
 */
export async function POST(req: NextRequest) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  let body: Record<string, unknown> | undefined;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const projectId = String(body?.project_id ?? "").trim();
  if (!projectId) {
    return NextResponse.json({ error: "project_id is required." }, { status: 400 });
  }
  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }
  const num = (v: unknown): number | null => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  await ensureMigrated();
  const project = await pgOne<{ id: string; tenant_id: number; status: string; lead_id: number | null }>(
    `SELECT id, tenant_id, status, lead_id FROM client_projects WHERE id = $1 LIMIT 1`,
    [projectId]
  );
  if (!project || Number(project.tenant_id) !== tenantId) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const title = String(body?.title ?? "").trim() || "Project Proposal";
  const budget = num(body?.budget);
  const timelineText = String(body?.timeline_text ?? "").trim() || null;
  const contentRaw = body?.content_json;
  const content =
    contentRaw && typeof contentRaw === "object"
      ? contentRaw
      : {};

  // Optional BOQ version link: must belong to the same project/tenant.
  let boqVersionId: string | null = null;
  if (body?.boq_version_id != null && body?.boq_version_id !== "") {
    const raw = String(body.boq_version_id).trim();
    const boq = await pgOne<{ id: string; client_project_id: string; tenant_id: number }>(
      `SELECT id, client_project_id, tenant_id FROM boq_versions WHERE id = $1 LIMIT 1`,
      [raw]
    );
    if (!boq || boq.client_project_id !== projectId || Number(boq.tenant_id) !== tenantId) {
      return NextResponse.json({ error: "BOQ version not found for this project." }, { status: 404 });
    }
    boqVersionId = raw;
  }

  try {
    const id = crypto.randomUUID();
    let token = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      token = generateProposalToken();
      const exists = await pgOne<{ id: string }>(
        `SELECT id FROM proposals WHERE token = $1 LIMIT 1`,
        [token]
      );
      if (!exists) break;
      token = "";
    }
    if (!token) {
      return NextResponse.json(
        { error: "Could not allocate a unique token." },
        { status: 500 }
      );
    }

    const leadId =
      body?.lead_id != null && body?.lead_id !== ""
        ? Number(body.lead_id)
        : (project.lead_id ?? null);

    const inserted = await withPgTx(async (client) => {
      const res = await client.query(
        `INSERT INTO proposals
           (id, tenant_id, project_id, lead_id, token, title, budget,
            timeline_text, content_json, boq_version_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, 'sent')
         RETURNING *`,
        [
          id,
          tenantId,
          projectId,
          Number.isFinite(leadId as number) ? leadId : null,
          token,
          title,
          budget,
          timelineText,
          JSON.stringify(content),
          boqVersionId,
        ]
      );
      // A project in draft moves to design once a proposal goes out.
      if (project.status === "draft") {
        await client.query(
          `UPDATE client_projects SET status = 'design' WHERE id = $1`,
          [projectId]
        );
      }
      return res.rows?.[0];
    });
    if (!inserted) {
      return NextResponse.json({ error: "Generate failed" }, { status: 400 });
    }
    return NextResponse.json({
      proposal: proposalDto(inserted),
      token,
      url: `/proposal/${token}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || "Generate failed" }, { status: 400 });
  }
}
