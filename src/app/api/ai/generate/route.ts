import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { resolveAdminTenantId } from "@/lib/theme";
import { runAiGeneration } from "@/lib/ai-run";
import { AI_TYPES, type AiType } from "@/lib/ai";

/**
 * Module 9 - POST /api/ai/generate { client_project_id?, type,
 * input? }. Tenant-scoped, requireAdminSession. Enforces the credit
 * budget (402 when exhausted), records the generation, and returns
 * { generation, credits, mock } so the UI can show the ledger state.
 */
export async function POST(req: NextRequest) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;
  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const type = String(body.type ?? "").trim() as AiType;
  if (!(AI_TYPES as readonly string[]).includes(type)) {
    return NextResponse.json({ error: "Unknown AI type." }, { status: 400 });
  }
  const clientProjectId =
    body.client_project_id == null || body.client_project_id === ""
      ? null
      : String(body.client_project_id);
  const result = await runAiGeneration({
    tenantId,
    type,
    clientProjectId,
    input:
      body.input && typeof body.input === "object"
        ? (body.input as Record<string, unknown>)
        : {},
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.status }
    );
  }
  return NextResponse.json(
    { generation: result.generation, credits: result.credits, mock: result.mock },
    { status: 201 }
  );
}
