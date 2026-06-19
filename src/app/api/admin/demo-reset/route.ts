import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs/promises";

const DB_PATH = path.join(process.cwd(), "data", "etihad.db");

async function ok() {
  const session = await getServerSession(authOptions);
  return Boolean((session?.user as any)?.id);
}

/**
 * Demo-only reset: clears media rows, projects, journal, testimonials,
 * team, page_blocks added by an operator. Re-runs the seed pages script
 * to repopulate the home page so the demo remains inspectable.
 *
 * Feature-frozen rooms can rely on this for live demos without re-deploy.
 */
export async function POST(req: NextRequest) {
  if (!(await ok())) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Demo reset is disabled in production. Use database migrations instead." },
      { status: 403 }
    );
  }
  try {
    const sqlite = new Database(DB_PATH);
    sqlite.exec(`
      DELETE FROM page_blocks;
      DELETE FROM media;
      DELETE FROM projects;
      DELETE FROM journal_posts;
      DELETE FROM testimonials;
      DELETE FROM team_members;
      DELETE FROM revisions;
    `);
    sqlite.close();
    // Repopulate home with the seeded layout
    const { execSync } = await import("child_process");
    execSync("node scripts/seed-pages.mjs", {
      cwd: process.cwd(),
      stdio: "pipe",
    });
    return NextResponse.json({
      success: true,
      message: "Demo data reset. Pages, media, blocks cleared and reseeded.",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Reset failed" },
      { status: 500 }
    );
  }
}
