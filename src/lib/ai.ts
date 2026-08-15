/**
 * src/lib/ai.ts - Module 9 AI provider surface.
 *
 * SERVER-ONLY. Talks to the Deepseek-compatible chat completions
 * endpoint (OpenAI wire format). No vendor lock: it reads
 * DEEPSEEK_API_KEY first, OPENAI_API_KEY second, and a per-tenant
 * tenants.openai_api_key column for white-label studios. When no key
 * is configured (the SQLite dev fallback), callDeepseek returns a
 * deterministic mock shaped per type so the whole pipeline - credit
 * metering, generations ledger, social drafts - runs and tests green
 * without spending tokens. Every call is recorded in ai_generations
 * with its credit cost for Module 10 freemium limits.
 */
import { ensureMigrated, pgOne } from "@/lib/pg";

/** Product label recorded on every generation row. */
export const MODEL_LABEL = "deepseek-v4-flash-0731";
/** Wire model id on the Deepseek-compatible endpoint. */
export const MODEL_WIRE = "deepseek-chat";

export type AiType =
  | "weekly_report"
  | "social_caption"
  | "proposal_summary"
  | "lead_score"
  | "budget_insight";

export const AI_TYPES: AiType[] = [
  "weekly_report",
  "social_caption",
  "proposal_summary",
  "lead_score",
  "budget_insight",
];

/** Normalized shape stored in ai_generations.output_json. */
export type AiOutput = {
  text?: string;
  captions?: string[];
  hinglish?: string;
  hashtags?: string[];
  report?: string;
  score?: number;
  reason?: string;
};

export type GenerationDto = {
  id: string;
  tenantId: number;
  clientProjectId: string | null;
  type: AiType;
  output: AiOutput;
  model: string;
  creditsUsed: number;
  createdAt: string | null;
};

export type AiCredits = { aiCredits: number; aiCreditsUsed: number };

/** Resolve the API key: per-tenant column first, then env. */
export function resolveAiApiKey(tenantKey: string | null | undefined): string | null {
  return (
    (tenantKey && tenantKey.trim()) ||
    process.env.DEEPSEEK_API_KEY ||
    process.env.OPENAI_API_KEY ||
    null
  );
}

/**
 * Call the Deepseek-compatible chat completions endpoint. Returns the
 * assistant text plus whether it came from the deterministic mock.
 * Any failure falls back to the mock so a key outage degrades to the
 * dev path instead of hard-failing the studio workflow.
 */
export async function callDeepseek(
  prompt: string,
  opts: {
    system?: string;
    type: AiType;
    apiKey?: string | null;
  }
): Promise<{ text: string; mock: boolean }> {
  const key = opts.apiKey || null;
  if (!key) {
    return { text: mockOutput(opts.type), mock: true };
  }
  try {
    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL_WIRE,
        temperature: 0.7,
        messages: [
          ...(opts.system ? [{ role: "system", content: opts.system }] : []),
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`deepseek ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    const data = await res.json();
    const text = String(data?.choices?.[0]?.message?.content ?? "").trim();
    if (!text) throw new Error("deepseek returned empty content");
    return { text, mock: false };
  } catch {
    return { text: mockOutput(opts.type), mock: true };
  }
}

/**
 * Deterministic mock output per type - the dev/SQLite path. Text is
 * stable (assertable in smoke) and shaped like the real model's JSON
 * where the route parses structured output.
 */
function mockOutput(type: AiType): string {
  switch (type) {
    case "weekly_report":
      return [
        "Work Completed",
        "This week the site moved at a good pace. False ceiling grid went up in the hall, electrical conduits were laid ahead of the plaster, and the wardrobe carcass work started in the master bedroom. Materials for the kitchen and tile laying reached the site on schedule.",
        "Labour & Materials",
        "Average of six to eight labourers on site through the week. One team handled the ceiling, the second the conduit work. Tiles, POP material and hardware were delivered on time; a small shortfall in channel clips was ordered and is expected early next week.",
        "Next Week Plan",
        "Plaster in the hall and bedrooms, tiling begins in the kitchen and toilets, and the wardrobe carcass assembly continues. The site supervisor will confirm the vitrified tile shade with the client before laying starts.",
      ].join("\n\n");
    case "social_caption":
      return JSON.stringify({
        captions: [
          "A hallway that does more than pass through. Timber, light and a quiet palette do the talking.",
          "From mood board to site - false ceiling grids up, conduits laid, and the palette starting to settle.",
          "The kitchen is where a home is actually run. We build it that way.",
        ],
        hinglish:
          "Ghar ki asli shuruaat kitchen se hoti hai. Is week site pe ceiling grid aur conduits ho gaye - agle hafte tiling shuru.",
        hashtags: [
          "#interiordesignindia",
          "#homedesign",
          "#etihadinteriors",
          "#mumbaiinteriors",
          "#indianhomes",
        ],
      });
    case "lead_score":
      return JSON.stringify({
        score: 82,
        reason: "High budget range and a direct website enquiry suggest strong purchase intent.",
      });
    case "proposal_summary":
      return "The proposal covers a full design and build scope: false ceiling, modular kitchen, wardrobes and electrical rewiring, with a clear timeline and a transparent line-item cost estimate.";
    case "budget_insight":
      return "The largest line items are carpentry and flooring. Locking the kitchen material early protects the total against rate movement.";
  }
}

/** Parse raw model text into the normalized output shape. */
export function parseAiOutput(type: AiType, raw: string): AiOutput {
  // Try JSON first (social_caption / lead_score are asked for JSON).
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  if (parsed && typeof parsed === "object") {
    const o = parsed as Record<string, unknown>;
    const arr = (v: unknown) =>
      Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : undefined;
    const out: AiOutput = {};
    if (typeof o.text === "string") out.text = o.text;
    if (typeof o.report === "string") out.report = o.report;
    if (typeof o.hinglish === "string") out.hinglish = o.hinglish;
    const caps = arr(o.captions);
    if (caps) out.captions = caps;
    const tags = arr(o.hashtags);
    if (tags) out.hashtags = tags;
    if (typeof o.score === "number") out.score = o.score;
    if (typeof o.reason === "string") out.reason = o.reason;
    if (Object.keys(out).length > 0) return out;
  }
  // Plain-text fallback.
  if (type === "weekly_report") return { report: raw, text: raw };
  if (type === "social_caption") {
    return { text: raw, captions: [raw] };
  }
  return { text: raw };
}

// ---- prompts ---------------------------------------------------------

export const WEEKLY_REPORT_SYSTEM =
  "You are an interior site report writer. Voice: 'We start at the kitchen table, not the mood board. Photograph shows moment, written report shows movement.' Write concise weekly reports in exactly three sections: Work Completed, Labour & Materials, Next Week Plan. Use only the data provided. No emojis. Forest & Bone tone - calm, material, precise. Keep under 300 words.";

export function weeklyReportPrompt(data: {
  projectName: string;
  from: string;
  to: string;
  logs: {
    date: string;
    workDone: string | null;
    labour: number;
    weather: string | null;
    transcript: string | null;
  }[];
  snags: { status: string; description: string }[];
}): string {
  const logLines = data.logs.length
    ? data.logs
        .map(
          (l) =>
            `- ${l.date} (labour ${l.labour}, ${l.weather ?? "n/a"}): ${l.workDone ?? "no note"}${l.transcript ? ` | voice note: ${l.transcript}` : ""}`
        )
        .join("\n")
    : "No site logs in this window.";
  const snagLines = data.snags.length
    ? data.snags
        .map((s) => `- [${s.status}] ${s.description}`)
        .join("\n")
    : "No snags recorded.";
  return `Write the weekly site report for "${data.projectName}" covering ${data.from} to ${data.to}.\n\nSite logs:\n${logLines}\n\nSnags:\n${snagLines}\n\nSections: Work Completed / Labour & Materials / Next Week Plan.`;
}

export const SOCIAL_CAPTION_SYSTEM =
  "You are an interior studio social copywriter for Instagram. Given a project name and moodboard description, write exactly three English captions (150 chars max each), one Hinglish caption, and five hashtags focused on interior design India. End each English caption with the CTA 'DM for consultation'. No emojis. Tone editorial, not salesy.";

export function socialCaptionPrompt(data: {
  projectName: string;
  boards: { title: string; items: string[] }[];
  photosCount: number;
}): string {
  const boardLines = data.boards.length
    ? data.boards
        .map((b) => `- ${b.title}: ${b.items.slice(0, 6).join(", ") || "no items tagged"}`)
        .join("\n")
    : "No moodboards yet.";
  return `Project: ${data.projectName}\nPhotos selected: ${data.photosCount}\n\nMoodboards:\n${boardLines}\n\nReturn JSON: {"captions":["...","...","..."],"hinglish":"...","hashtags":["..."]}`;
}

export const LEAD_SCORE_SYSTEM =
  "You are a lead scoring assistant for an interior design studio. Score a lead 0-100 based on budget, source, and any notes. Return JSON only: {\"score\":0-100,\"reason\":\"one line\"}.";

export function leadScorePrompt(lead: {
  name: string;
  budget: string | null;
  source: string;
  notes?: string | null;
}): string {
  return `Lead: ${lead.name}\nBudget: ${lead.budget ?? "not shared"}\nSource: ${lead.source}\nNotes: ${lead.notes ?? "none"}\n\nReturn JSON: {"score":0-100,"reason":"one line"}`;
}

export const PROPOSAL_SUMMARY_SYSTEM =
  "You summarize interior design proposals for the studio's own records. One tight paragraph, no emojis, no marketing language.";

export function proposalSummaryPrompt(data: {
  title: string;
  budget: number | null;
  timeline: string | null;
  scope: string[];
}): string {
  return `Summarize this proposal in one paragraph.\nTitle: ${data.title}\nBudget: ${data.budget ?? "n/a"}\nTimeline: ${data.timeline ?? "n/a"}\nScope: ${data.scope.join(", ") || "n/a"}`;
}

export const BUDGET_INSIGHT_SYSTEM =
  "You are a construction cost analyst for Indian interior fit-outs. Read the BOQ totals by category and give one sharp budget insight - the biggest risk and one way to protect the total. No emojis, under 120 words.";

export function budgetInsightPrompt(data: {
  projectName: string;
  total: number;
  byCategory: { category: string; total: number }[];
}): string {
  const catLines = data.byCategory
    .map((c) => `- ${c.category}: ${c.total}`)
    .join("\n");
  return `Project: ${data.projectName}\nTotal: ${data.total}\nBy category:\n${catLines}\n\nGive one insight.`;
}

// ---- credit ledger ---------------------------------------------------

export async function getTenantAiCredits(tenantId: number): Promise<AiCredits> {
  await ensureMigrated();
  const row = await pgOne<{
    ai_credits: number;
    ai_credits_used: number;
    openai_api_key: string | null;
    plan_limit: number | null;
  }>(
    `SELECT t.ai_credits, t.ai_credits_used, t.openai_api_key,
            p.ai_credits_limit AS plan_limit
     FROM tenants t
     LEFT JOIN plans p ON p.id = t.plan_id
     WHERE t.id = $1 LIMIT 1`,
    [tenantId]
  );
  // Module 10: the plan's ai_credits_limit is authoritative once a
  // plans row exists (free = 20). Pre-seed tenants fall back to the
  // module 9 hard-coded column value.
  const planLimit = row?.plan_limit == null ? null : Number(row.plan_limit);
  const limit =
    planLimit != null ? planLimit : Number(row?.ai_credits ?? 100);
  return {
    aiCredits: limit,
    aiCreditsUsed: Number(row?.ai_credits_used ?? 0),
  };
}
