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
      `SELECT id, title, body, created_at FROM announcements
       WHERE is_active = 1 AND audience IN ('all', 'public')
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
  } catch {
    return NextResponse.json({ ok: true, items: [] });
  }
}
