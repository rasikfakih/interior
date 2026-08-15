/**
 * src/lib/ai-run.ts - Module 9 shared generation pipeline (server-only).
 *
 * Both POST /api/ai/generate and POST /api/social/generate run their
 * work through runAiGeneration: it validates the type, enforces the
 * tenant credit budget (402 when exhausted), builds the type-specific
 * prompt from the database, calls the Deepseek-compatible endpoint,
 * records the ai_generations row, and increments ai_credits_used in
 * one transaction. The client_project_id is nullable because lead
 * scoring happens before a project exists.
 */
import { ensureMigrated, pgMany, pgOne, withPgTx } from "@/lib/pg";
import {
  AI_TYPES,
  BUDGET_INSIGHT_SYSTEM,
  LEAD_SCORE_SYSTEM,
  MODEL_LABEL,
  PROPOSAL_SUMMARY_SYSTEM,
  SOCIAL_CAPTION_SYSTEM,
  WEEKLY_REPORT_SYSTEM,
  budgetInsightPrompt,
  callDeepseek,
  getTenantAiCredits,
  leadScorePrompt,
  parseAiOutput,
  proposalSummaryPrompt,
  resolveAiApiKey,
  socialCaptionPrompt,
  weeklyReportPrompt,
  type AiCredits,
  type AiOutput,
  type AiType,
  type GenerationDto,
} from "@/lib/ai";
import { mapSiteLogRow, mapSnagRow } from "@/lib/site-diary";

export type AiRunResult =
  | { ok: true; generation: GenerationDto; credits: AiCredits; mock: boolean }
  | { ok: false; error: string; status: number; code?: string };

function daysAgoIso(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseJson<T>(raw: unknown): T {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return {} as T;
    }
  }
  return (raw ?? {}) as T;
}

export async function runAiGeneration(opts: {
  tenantId: number;
  type: AiType;
  clientProjectId?: string | null;
  input?: Record<string, unknown>;
}): Promise<AiRunResult> {
  const type = opts.type;
  if (!(AI_TYPES as readonly string[]).includes(type)) {
    return { ok: false, error: "Unknown AI type.", status: 400 };
  }
  const input = opts.input ?? {};
  await ensureMigrated();

  // Credit budget: used must stay strictly below the allowance.
  const credits = await getTenantAiCredits(opts.tenantId);
  if (credits.aiCreditsUsed >= credits.aiCredits) {
    return {
      ok: false,
      error: "AI credits exhausted. Add more in your plan or contact the studio.",
      status: 402,
      code: "PLAN_LIMIT",
    };
  }

  // Resolve the per-tenant key (fallback to env).
  const tenantRow = await pgOne<{ openai_api_key: string | null }>(
    `SELECT openai_api_key FROM tenants WHERE id = $1 LIMIT 1`,
    [opts.tenantId]
  );
  const apiKey = resolveAiApiKey(tenantRow?.openai_api_key ?? null);

  let system = "";
  let prompt = "";
  let projectId: string | null = opts.clientProjectId ?? null;
  let leadId: number | null = null;

  const requireProject = async (): Promise<{ name: string } | null> => {
    if (!opts.clientProjectId) return null;
    const p = await pgOne<{ id: string; name: string }>(
      `SELECT id, name FROM client_projects WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [opts.clientProjectId, opts.tenantId]
    );
    if (!p) return null;
    projectId = String(p.id);
    return { name: String(p.name ?? "") };
  };

  if (type === "weekly_report") {
    const project = await requireProject();
    if (!project) {
      return { ok: false, error: "Project not found.", status: 404 };
    }
    const from = String(input.from ?? daysAgoIso(6));
    const to = String(input.to ?? todayIso());
    const logRows = await pgMany<Record<string, unknown>>(
      `SELECT id, tenant_id, client_project_id, log_date, photos,
              labour_count, work_done, voice_transcript, weather,
              created_by, created_at
       FROM site_logs
       WHERE tenant_id = $1 AND client_project_id = $2
         AND log_date >= $3 AND log_date <= $4
       ORDER BY log_date ASC, created_at ASC`,
      [opts.tenantId, projectId, from, to]
    );
    const snagRows = await pgMany<Record<string, unknown>>(
      `SELECT * FROM snags WHERE tenant_id = $1 AND client_project_id = $2 ORDER BY created_at ASC`,
      [opts.tenantId, projectId]
    );
    const logs = logRows.map(mapSiteLogRow).map((l) => ({
      date: l.logDate ?? "",
      workDone: l.workDone,
      labour: l.labourCount,
      weather: l.weather,
      transcript: l.voiceTranscript,
    }));
    const snags = snagRows.map(mapSnagRow).map((s) => ({
      status: s.status,
      description: s.description,
    }));
    system = WEEKLY_REPORT_SYSTEM;
    prompt = weeklyReportPrompt({ projectName: project.name, from, to, logs, snags });
  } else if (type === "social_caption") {
    const project = await requireProject();
    if (!project) {
      return { ok: false, error: "Project not found.", status: 404 };
    }
    const boardRows = await pgMany<Record<string, unknown>>(
      `SELECT id, title FROM boards
       WHERE client_project_id = $1 AND tenant_id = $2
       ORDER BY updated_at DESC, created_at DESC`,
      [projectId, opts.tenantId]
    );
    const boards: { title: string; items: string[] }[] = [];
    for (const br of boardRows) {
      const itemRows = await pgMany<Record<string, unknown>>(
        `SELECT m.name AS m_name
         FROM board_items bi
         LEFT JOIN materials m ON m.id = bi.material_id
         WHERE bi.board_id = $1`,
        [String(br.id)]
      );
      boards.push({
        title: String(br.title ?? "Moodboard"),
        items: itemRows.map((r) => String(r.m_name ?? "")).filter(Boolean),
      });
    }
    const photoUrls = Array.isArray(input.photo_urls)
      ? input.photo_urls.map((u) => String(u)).filter(Boolean)
      : [];
    system = SOCIAL_CAPTION_SYSTEM;
    prompt = socialCaptionPrompt({
      projectName: project.name,
      boards,
      photosCount: photoUrls.length,
    });
  } else if (type === "lead_score") {
    const rawLeadId = input.lead_id;
    if (rawLeadId == null) {
      return { ok: false, error: "input.lead_id is required for lead_score.", status: 400 };
    }
    leadId = Number(rawLeadId);
    const lead = await pgOne<{
      id: number;
      name: string;
      budget: string | null;
      source: string;
    }>(`SELECT id, name, budget, source FROM leads WHERE id = $1 LIMIT 1`, [leadId]);
    if (!lead) {
      return { ok: false, error: "Lead not found.", status: 404 };
    }
    system = LEAD_SCORE_SYSTEM;
    prompt = leadScorePrompt({
      name: String(lead.name ?? ""),
      budget: lead.budget == null ? null : String(lead.budget),
      source: String(lead.source ?? "manual"),
    });
  } else if (type === "proposal_summary") {
    const rawProposalId = input.proposal_id;
    if (!rawProposalId) {
      return { ok: false, error: "input.proposal_id is required for proposal_summary.", status: 400 };
    }
    const proposal = await pgOne<Record<string, unknown>>(
      `SELECT * FROM proposals WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [String(rawProposalId), opts.tenantId]
    );
    if (!proposal) {
      return { ok: false, error: "Proposal not found.", status: 404 };
    }
    projectId = proposal.project_id == null ? null : String(proposal.project_id);
    const content = parseJson<{ scope?: string[] }>(proposal.content_json);
    system = PROPOSAL_SUMMARY_SYSTEM;
    prompt = proposalSummaryPrompt({
      title: String(proposal.title ?? "Project Proposal"),
      budget: proposal.budget == null ? null : Number(proposal.budget),
      timeline: proposal.timeline_text == null ? null : String(proposal.timeline_text),
      scope: Array.isArray(content.scope) ? content.scope.map(String) : [],
    });
  } else if (type === "budget_insight") {
    const project = await requireProject();
    if (!project) {
      return { ok: false, error: "Project not found.", status: 404 };
    }
    const version = await pgOne<Record<string, unknown>>(
      `SELECT * FROM boq_versions
       WHERE client_project_id = $1 AND tenant_id = $2
       ORDER BY CASE WHEN status = 'approved' THEN 0 ELSE 1 END, version_no DESC
       LIMIT 1`,
      [projectId, opts.tenantId]
    );
    if (!version) {
      return { ok: false, error: "No BOQ version for this project yet.", status: 400 };
    }
    const itemRows = await pgMany<{ category: string; amount: number }>(
      `SELECT category, amount FROM boq_items WHERE boq_version_id = $1`,
      [String(version.id)]
    );
    const byCategory = new Map<string, number>();
    for (const i of itemRows) {
      byCategory.set(String(i.category), (byCategory.get(String(i.category)) ?? 0) + Number(i.amount ?? 0));
    }
    system = BUDGET_INSIGHT_SYSTEM;
    prompt = budgetInsightPrompt({
      projectName: project.name,
      total: Number(version.total ?? 0),
      byCategory: [...byCategory.entries()].map(([category, total]) => ({ category, total })),
    });
  }

  if (!prompt) {
    return { ok: false, error: "Could not build a prompt for this input.", status: 400 };
  }

  const { text, mock } = await callDeepseek(prompt, { system, type, apiKey });
  const output: AiOutput = parseAiOutput(type, text);

  const generation = await withPgTx(async (client) => {
    const r = await client.query<Record<string, unknown>>(
      `INSERT INTO ai_generations
         (id, tenant_id, client_project_id, type, input_json, output_json, model, credits_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
       RETURNING *`,
      [
        crypto.randomUUID(),
        opts.tenantId,
        projectId,
        type,
        JSON.stringify(input),
        JSON.stringify(output),
        MODEL_LABEL,
      ]
    );
    await client.query(
      `UPDATE tenants SET ai_credits_used = ai_credits_used + 1 WHERE id = $1`,
      [opts.tenantId]
    );
    return r.rows[0];
  });

  const fresh = await getTenantAiCredits(opts.tenantId);
  return {
    ok: true,
    generation: {
      id: String(generation.id),
      tenantId: Number(generation.tenant_id ?? 0),
      clientProjectId: generation.client_project_id == null ? null : String(generation.client_project_id),
      type: type as AiType,
      output,
      model: String(generation.model ?? MODEL_LABEL),
      creditsUsed: Number(generation.credits_used ?? 1),
      createdAt: generation.created_at == null ? null : String(generation.created_at),
    },
    credits: fresh,
    mock,
  };
}

/** Map a raw ai_generations row to the list DTO (parse both JSONs). */
export function mapGenerationRow(r: Record<string, unknown>): GenerationDto {
  return {
    id: String(r.id),
    tenantId: Number(r.tenant_id ?? 0),
    clientProjectId: r.client_project_id == null ? null : String(r.client_project_id),
    type: (String(r.type ?? "weekly_report") as AiType),
    output: parseJson<AiOutput>(r.output_json),
    model: String(r.model ?? MODEL_LABEL),
    creditsUsed: Number(r.credits_used ?? 1),
    createdAt: r.created_at == null ? null : String(r.created_at),
  };
}
