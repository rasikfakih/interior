/**
 * Module 10: freemium plan resolution + limit gating.
 *
 * The single source of truth for "what may this tenant create?". Every
 * create API that the plan catalog limits (client projects, leads,
 * boards, BOQ versions, AI credits, white-label domains) calls
 * checkPlan() before its INSERT and surfaces a 402 with a reason when
 * the plan is exceeded, so the admin UI can show an upgrade modal.
 *
 * Limits live on the plans row (plans.project_limit etc.); -1 means
 * unlimited. Usage is counted live from the tenant-scoped tables.
 * tenants.ai_credits mirrors the plan's ai_credits_limit and is what
 * the AI runner reads, so the two never drift.
 */
import { ensureMigrated, pgMany, pgOne, withPgTx } from "@/lib/pg";

export type PlanFeatures = {
  white_label: boolean;
  custom_domain: boolean;
  client_subdomain: boolean;
  portal_approvals: boolean;
  export_pdf: boolean;
  social_autopilot: boolean;
  team_members: number;
};

export type TenantPlan = {
  planId: string;
  planName: string;
  priceUsd: number;
  priceInr: number;
  projectLimit: number;
  leadLimit: number;
  boardLimit: number;
  boqVersionLimit: number;
  aiCreditsLimit: number;
  features: PlanFeatures;
  subscriptionStatus: string;
  planStartedAt: string | null;
  planEndsAt: string | null;
  billingCycle: string | null;
};

export type PlanUsage = {
  projects: { used: number; limit: number };
  leads: { used: number; limit: number };
  boards: { used: number; limit: number };
  boqVersions: { used: number; limit: number };
  aiCredits: { used: number; limit: number };
  whiteLabel: boolean;
};

export type CheckResult = {
  allowed: boolean;
  feature: string;
  usage: number;
  limit: number;
  reason: string;
  status: number;
};

function parseFeatures(raw: string | null | Record<string, unknown>): PlanFeatures {
  const f: PlanFeatures = {
    white_label: false,
    custom_domain: false,
    client_subdomain: false,
    portal_approvals: true,
    export_pdf: false,
    social_autopilot: false,
    team_members: 1,
  };
  if (!raw) return f;
  let obj: Record<string, unknown> = {};
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return f;
    }
  } else {
    obj = raw;
  }
  return {
    white_label: Boolean(obj.white_label),
    custom_domain: Boolean(obj.custom_domain),
    client_subdomain: Boolean(obj.client_subdomain),
    portal_approvals: obj.portal_approvals !== false,
    export_pdf: Boolean(obj.export_pdf),
    social_autopilot: Boolean(obj.social_autopilot),
    team_members: Number(obj.team_members ?? 1),
  };
}

/** Resolve the plan row + tenant subscription state for a tenant. */
export async function getTenantPlan(tenantId: number): Promise<TenantPlan> {
  await ensureMigrated();
  const row = await pgOne<Record<string, unknown>>(
    `SELECT t.plan_id, t.subscription_status, t.plan_started_at, t.plan_ends_at,
            t.billing_cycle, p.name AS plan_name, p.price_usd, p.price_inr,
            p.project_limit, p.lead_limit, p.board_limit, p.boq_version_limit,
            p.ai_credits_limit, p.features_json
     FROM tenants t
     LEFT JOIN plans p ON p.id = t.plan_id
     WHERE t.id = $1 LIMIT 1`,
    [tenantId]
  );
  const fallback: TenantPlan = {
    planId: "free",
    planName: "Free",
    priceUsd: 0,
    priceInr: 0,
    projectLimit: 1,
    leadLimit: 25,
    boardLimit: 2,
    boqVersionLimit: 1,
    aiCreditsLimit: 20,
    features: parseFeatures(null),
    subscriptionStatus: String(row?.subscription_status ?? "trialing"),
    planStartedAt: (row?.plan_started_at as string) ?? null,
    planEndsAt: (row?.plan_ends_at as string) ?? null,
    billingCycle: (row?.billing_cycle as string) ?? "monthly",
  };
  if (!row || row.plan_id == null || !row.plan_name) {
    // No plans table yet (pre-seed): fall back to the free defaults so
    // the app still runs with the module 9 hard-coded credits.
    return fallback;
  }
  return {
    planId: String(row.plan_id),
    planName: String(row.plan_name),
    priceUsd: Number(row.price_usd ?? 0),
    priceInr: Number(row.price_inr ?? 0),
    projectLimit: Number(row.project_limit ?? 1),
    leadLimit: Number(row.lead_limit ?? 25),
    boardLimit: Number(row.board_limit ?? 2),
    boqVersionLimit: Number(row.boq_version_limit ?? 1),
    aiCreditsLimit: Number(row.ai_credits_limit ?? 20),
    features: parseFeatures(row.features_json as string),
    subscriptionStatus: String(row.subscription_status ?? "trialing"),
    planStartedAt: (row.plan_started_at as string) ?? null,
    planEndsAt: (row.plan_ends_at as string) ?? null,
    billingCycle: (row.billing_cycle as string) ?? "monthly",
  };
}

/** Live usage counts for the plan-gated features of a tenant. */
export async function getPlanUsage(tenantId: number): Promise<PlanUsage> {
  await ensureMigrated();
  const plan = await getTenantPlan(tenantId);
  const projects = await pgOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM client_projects WHERE tenant_id = $1`,
    [tenantId]
  );
  const leads = await pgOne<{ n: number }>(`SELECT COUNT(*) AS n FROM leads`);
  const boards = await pgOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM boards WHERE tenant_id = $1`,
    [tenantId]
  );
  const boqVersions = await pgOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM boq_versions WHERE tenant_id = $1`,
    [tenantId]
  );
  const credits = await pgOne<{ used: number; limit_n: number }>(
    `SELECT ai_credits_used AS used, ai_credits AS limit_n FROM tenants WHERE id = $1 LIMIT 1`,
    [tenantId]
  );
  // The plan's ai_credits_limit is authoritative (matches the AI
  // runner); tenants.ai_credits is the pre-plan fallback column.
  const aiLimit = plan.aiCreditsLimit >= 0 ? plan.aiCreditsLimit : Number(credits?.limit_n ?? plan.aiCreditsLimit);
  return {
    projects: { used: Number(projects?.n ?? 0), limit: plan.projectLimit },
    leads: { used: Number(leads?.n ?? 0), limit: plan.leadLimit },
    boards: { used: Number(boards?.n ?? 0), limit: plan.boardLimit },
    boqVersions: { used: Number(boqVersions?.n ?? 0), limit: plan.boqVersionLimit },
    aiCredits: {
      used: Number(credits?.used ?? 0),
      limit: aiLimit,
    },
    whiteLabel: plan.features.white_label,
  };
}

/**
 * activateSubscription: upgrade a tenant to a plan. Shared by the
 * Stripe/Razorpay webhooks and the dev mock-upgrade. Sets plan_id,
 * subscription state, resets ai_credits_used and tops ai_credits to
 * the plan limit, and flips the matching subscriptions row to active.
 */
export async function activateSubscription(opts: {
  tenantId: number;
  planId: string;
  provider: "stripe" | "razorpay" | "manual";
  providerSubscriptionId?: string | null;
  billingCycle?: string;
}): Promise<void> {
  await ensureMigrated();
  const plan = await pgOne<{ ai_credits_limit: number }>(
    `SELECT ai_credits_limit FROM plans WHERE id = $1 LIMIT 1`,
    [opts.planId]
  );
  const creditLimit = Number(plan?.ai_credits_limit ?? 0);
  const cycle = opts.billingCycle === "yearly" ? "yearly" : "monthly";
  const now = new Date();
  const end = new Date(now);
  end.setMonth(end.getMonth() + (cycle === "yearly" ? 12 : 1));
  await withPgTx(async (client) => {
    await client.query(
      `UPDATE tenants
       SET plan_id = $1,
           subscription_status = 'active',
           billing_cycle = $2,
           plan_started_at = $3,
           plan_ends_at = $4,
           ai_credits = $5,
           ai_credits_used = 0
       WHERE id = $6`,
      [opts.planId, cycle, now.toISOString(), end.toISOString(), creditLimit, opts.tenantId]
    );
    if (opts.providerSubscriptionId) {
      await client.query(
        `UPDATE subscriptions
         SET status = 'active',
             current_period_start = $1,
             current_period_end = $2
         WHERE provider_subscription_id = $3 OR (tenant_id = $4 AND status = 'pending' AND plan_id = $5)`,
        [now.toISOString(), end.toISOString(), opts.providerSubscriptionId, opts.tenantId, opts.planId]
      );
    }
  });
}

/** 0-100 usage percent; -1 limits are unlimited and return 0. */
export function getUsagePercent(usage: number, limit: number): number {
  if (limit === -1) return 0;
  if (limit <= 0) return 100;
  return Math.min(100, Math.round((usage / limit) * 100));
}

/**
 * checkPlan(tenantId, feature): does the tenant's plan allow one more?
 * Feature kinds: projects | leads | boards | boq_versions | ai_credits |
 * white_label | custom_domain | client_subdomain.
 */
export async function checkPlan(
  tenantId: number,
  feature: string
): Promise<CheckResult> {
  await ensureMigrated();
  const plan = await getTenantPlan(tenantId);
  const usage = await getPlanUsage(tenantId);

  const notAllowed = (usageN: number, limit: number, label: string): CheckResult => ({
    allowed: false,
    feature,
    usage: usageN,
    limit,
    reason: `${label} limit reached (${usageN}/${limit === -1 ? "unlimited" : limit}). Upgrade your plan to add more.`,
    status: 402,
  });

  switch (feature) {
    case "projects":
      if (plan.projectLimit === -1) return ok(usage.projects.used, -1, "projects");
      return usage.projects.used >= plan.projectLimit
        ? notAllowed(usage.projects.used, plan.projectLimit, "Project")
        : ok(usage.projects.used, plan.projectLimit, "projects");
    case "leads":
      if (plan.leadLimit === -1) return ok(usage.leads.used, -1, "leads");
      return usage.leads.used >= plan.leadLimit
        ? notAllowed(usage.leads.used, plan.leadLimit, "Lead")
        : ok(usage.leads.used, plan.leadLimit, "leads");
    case "boards":
      if (plan.boardLimit === -1) return ok(usage.boards.used, -1, "boards");
      return usage.boards.used >= plan.boardLimit
        ? notAllowed(usage.boards.used, plan.boardLimit, "Board")
        : ok(usage.boards.used, plan.boardLimit, "boards");
    case "boq_versions":
      if (plan.boqVersionLimit === -1) return ok(usage.boqVersions.used, -1, "boq");
      return usage.boqVersions.used >= plan.boqVersionLimit
        ? notAllowed(usage.boqVersions.used, plan.boqVersionLimit, "BOQ version")
        : ok(usage.boqVersions.used, plan.boqVersionLimit, "boq_versions");
    case "ai_credits":
      if (usage.aiCredits.limit === -1)
        return ok(usage.aiCredits.used, -1, "ai_credits");
      return usage.aiCredits.used >= usage.aiCredits.limit
        ? notAllowed(usage.aiCredits.used, usage.aiCredits.limit, "AI credits")
        : ok(usage.aiCredits.used, usage.aiCredits.limit, "ai_credits");
    case "white_label":
      return plan.features.white_label
        ? ok(0, 1, "white_label")
        : {
            allowed: false,
            feature,
            usage: 0,
            limit: 1,
            reason: "White-label branding is a Pro feature. Upgrade to remove the Studio OS footer.",
            status: 402,
          };
    case "custom_domain":
      return plan.features.custom_domain
        ? ok(0, 1, "custom_domain")
        : {
            allowed: false,
            feature,
            usage: 0,
            limit: 1,
            reason: "Custom domains are a Studio plan feature. Upgrade to connect your own domain.",
            status: 402,
          };
    case "client_subdomain":
      return plan.features.client_subdomain
        ? ok(0, 1, "client_subdomain")
        : {
            allowed: false,
            feature,
            usage: 0,
            limit: 1,
            reason: "Client subdomains are a Starter plan feature. Upgrade to get your own portal host.",
            status: 402,
          };
    default:
      return ok(0, -1, feature);
  }
}

function ok(usageN: number, limit: number, feature: string): CheckResult {
  return {
    allowed: true,
    feature,
    usage: usageN,
    limit,
    reason: "",
    status: 200,
  };
}

/** Helper: a 402 NextResponse-style body for the create APIs. */
export function planBlockedBody(result: CheckResult) {
  return {
    error: result.reason,
    code: "PLAN_LIMIT",
    feature: result.feature,
    usage: result.usage,
    limit: result.limit,
  };
}
