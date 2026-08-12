import { NextResponse } from "next/server";
import { recordUsage } from "@/lib/usage";

/**
 * POST /api/usage/record - fire-and-forget pageview recording.
 * Called by the client-side UsageBeacon on public page views.
 * Always answers 204 so the beacon cost is one cheap no-op even
 * when the durable store is down.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const path =
    typeof body.path === "string" && body.path.startsWith("/")
      ? body.path.slice(0, 300)
      : "/";
  const host = typeof body.host === "string" ? body.host : "";
  // Phase 6: accept the full usage event vocabulary the metrics page
  // aggregates (pageview | model_3d_load | form_submit). Anything else
  // defaults to pageview so a malformed beacon can't wedge recording.
  const kind =
    body.kind === "model_3d_load" || body.kind === "form_submit"
      ? body.kind
      : "pageview";
  void recordUsage(kind, path, host ? { host } : undefined);
  return new NextResponse(null, { status: 204 });
}
