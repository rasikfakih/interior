import { NextResponse } from "next/server";
import { requireLicense, type Gate } from "@/lib/license-gate";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export type Action = "read-public" | "mutate" | "admin";

export async function gateAdmin(): Promise<
  | { ok: true }
  | { ok: false; response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Sign in required" }, { status: 401 }),
    };
  }
  const gate = await requireLicense("admin");
  if (!gate.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: gate.reason },
        { status: gate.code }
      ),
    };
  }
  return { ok: true };
}
