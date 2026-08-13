import { NextResponse } from "next/server";
import { ensureMigrated, pgMany } from "@/lib/pg";

/**
 * GET /api/announcements - public read of active announcements.
 * Only audience 'all' / 'public' rows are served; the tenant admin
 * shell could add an audience filter later. This powers the
 * dismissible AnnouncementBar on public pages.
 */
export async function GET() {
  try {
    await ensureMigrated();
    const rows = await pgMany<{
      id: number;
      title: string;
      body: string;
      created_at: string;
    }>(
      // is_active is boolean in Postgres: `= 1` is invalid there, so
      // use the TRUE literal (portable to SQLite too).
      `SELECT id, title, body, created_at FROM announcements
       WHERE is_active = TRUE AND audience IN ('all', 'public')
       ORDER BY id DESC LIMIT 5`
    );
    return NextResponse.json({
      ok: true,
      items: rows.map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        created_at: r.created_at,
      })),
    });
  } catch (err) {
    // Public read: degrade to an empty list, but never silently -
    // log so a broken query (or schema drift) is visible in logs.
    console.error("announcements read failed:", (err as Error)?.message || err);
    return NextResponse.json({ ok: true, items: [] });
  }
}
