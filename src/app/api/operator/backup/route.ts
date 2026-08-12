import { NextResponse } from "next/server";
import { getOperatorSession } from "@/lib/operator-auth";
import {
  generateBackupSnapshot,
  persistBackup,
  listBackupFiles,
  readBackupFile,
} from "@/lib/backup";
import { appendAudit } from "@/lib/license";

/**
 * Phase 6: operator backup.
 *
 * POST /api/operator/backup            - generate a full-table snapshot,
 *                                         persist to data/backups/ (best
 *                                         effort), audit, return metadata.
 * POST /api/operator/backup?download=1 - same, but stream the snapshot
 *                                         as a JSON attachment (safe on
 *                                         serverless where disk is
 *                                         ephemeral).
 * GET  /api/operator/backup            - list persisted backup files.
 * GET  /api/operator/backup?download=<name> - download a named file.
 */
export async function GET(req: Request) {
  const ok = await getOperatorSession();
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const name = searchParams.get("download");
  if (name) {
    const file = readBackupFile(name);
    if (!file) {
      return NextResponse.json({ error: "backup not found" }, { status: 404 });
    }
    return new NextResponse(file.data, {
      headers: {
        "content-type": "application/json",
        "content-disposition": `attachment; filename="${file.name}"`,
      },
    });
  }

  return NextResponse.json({ ok: true, items: listBackupFiles() });
}

export async function POST(req: Request) {
  const ok = await getOperatorSession();
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const download = searchParams.get("download") === "1";

  try {
    const { snapshot, rows, bytes } = await generateBackupSnapshot();
    const persisted = persistBackup(snapshot);
    await appendAudit("backup.created", "operator backup snapshot generated", {
      rows,
      bytes,
      file: persisted,
      source: snapshot.source,
    });

    if (download) {
      const stamp = snapshot.generated_at.replace(/[:.]/g, "-").slice(0, 19);
      return new NextResponse(JSON.stringify(snapshot, null, 2), {
        headers: {
          "content-type": "application/json",
          "content-disposition": `attachment; filename="backup-${stamp}.json"`,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      rows,
      bytes,
      persisted,
      generated_at: snapshot.generated_at,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
