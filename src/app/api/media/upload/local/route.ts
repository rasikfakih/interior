import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  getStorageConfig,
  kindFromMime,
  localWrite,
  MAX_BYTES,
  type StorageKind,
} from "@/lib/storage";
import { ensureMigrated, pgOne } from "@/lib/pg";

/**
 * Local-mode sink for Phase 2 media uploads.
 *
 * The `signedPutUrl()` surface, in local mode, returns this
 * URL. The client PUTs the file body here, we write it under
 * `public/uploads/media/<path>` and bump the matching `media`
 * row's `size` field.
 *
 * No-op return when running in supabase mode.
 */
export async function PUT(req: NextRequest) {
  const cfg = getStorageConfig();
  if (cfg.mode !== "local") {
    return NextResponse.json(
      { error: "local upload endpoint disabled (supabase mode)" },
      { status: 410 }
    );
  }
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const storagePath = url.searchParams.get("path");
  if (!storagePath || !/^[\w\-./]+$/.test(storagePath)) {
    return NextResponse.json({ error: "missing or invalid path" }, { status: 400 });
  }
  const declaredKind = (url.searchParams.get("kind") as StorageKind | null) ??
    kindFromMime(req.headers.get("content-type") || "application/octet-stream");
  const cap = MAX_BYTES[declaredKind] ?? 25 * 1024 * 1024;
  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length === 0) {
    return NextResponse.json({ error: "empty body" }, { status: 400 });
  }
  if (buf.length > cap) {
    return NextResponse.json(
      { error: `kind "${declaredKind}" cap is ${cap} bytes; got ${buf.length}` },
      { status: 400 }
    );
  }
  try {
    await localWrite(storagePath, buf);
  } catch (e: any) {
    return NextResponse.json(
      { error: `local write failed: ${e?.message ?? "unknown"}` },
      { status: 500 }
    );
  }

  // Mirror the size into the media row so the library reflects reality.
  try {
    await ensureMigrated();
    await pgOne(
      `UPDATE media SET size = $1 WHERE storage_path = $2`,
      [buf.length, storagePath]
    );
  } catch {
    // Non-fatal; the row exists from the upload intent.
  }

  return NextResponse.json({
    ok: true,
    storagePath,
    size: buf.length,
    kind: declaredKind,
  });
}
