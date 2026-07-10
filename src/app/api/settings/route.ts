import { NextRequest, NextResponse } from "next/server";
import { ensureMigrated, pgMany, pgQuery } from "@/lib/pg";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  isWhitelisted,
  getCreateableEntries,
  SETTINGS_WHITELIST,
} from "@/lib/settings-whitelist";

export async function GET() {
  await ensureMigrated();
  const rows = await pgMany(`SELECT * FROM settings ORDER BY key ASC`);
  // /api/settings list is anonymous-readable but the response only
  // ships whitelisted keys. Unknown keys present in the table
  // (legacy / drift) are skipped so an editor client doesn't expose
  // them.
  const filtered = (rows ?? []).filter((r: any) => isWhitelisted(r.key));
  return NextResponse.json(filtered);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { key, value, advertise_new } = body ?? {};
    if (!key || typeof value !== "string") {
      return NextResponse.json(
        { error: "key and value (string) required" },
        { status: 400 }
      );
    }
    const k = String(key).slice(0, 100);
    if (!isWhitelisted(k)) {
      return NextResponse.json(
        {
          error:
            "Key is not in the editable whitelist. Add it to SETTINGS_WHITELIST first.",
          key: k,
        },
        { status: 400 }
      );
    }
    // Hybrid extension surface: only `allowNew` entries can be
    // POSTed for new rows when body.advertise_new === true.
    // Existing rows use PUT on /api/settings/[key].
    const exists = await pgMany(
      `SELECT 1 FROM settings WHERE key = $1 LIMIT 1`,
      [k]
    );
    const isNew = !exists || (Array.isArray(exists) && exists.length === 0);
    if (isNew && advertise_new !== true) {
      return NextResponse.json(
        { error: "Use PUT on /api/settings/[key] to update an existing row." },
        { status: 400 }
      );
    }
    if (
      isNew &&
      advertise_new === true &&
      !getCreateableEntries().some((c) => c.key === k)
    ) {
      return NextResponse.json(
        {
          error: "Key is not flagged allowNew in SETTINGS_WHITELIST.",
          key: k,
        },
        { status: 400 }
      );
    }
    const v = String(value).slice(0, 2000);
    const r = await pgQuery(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
       RETURNING *`,
      [k, v]
    );
    return NextResponse.json({ success: true, item: r.rows?.[0] ?? null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
