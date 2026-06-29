import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import path from "path";

/**
 * Local-mode serve path. When SUPABASE_URL is unset we cannot
 * write to /public (read-only on Vercel). The Phase 2 path:
 *
 *   1. /api/media/upload routes a request to PUT
 *   2. /api/media/upload/local writes the bytes to a writable
 *      scratch (default /tmp/etihad-uploads/media/<path>)
 *   3. /uploads/media/<path> -> /api/uploads/local?path=...
 *      streams the file back to the browser (this route).
 *
 * In supabase mode this route is no-op'd with 404. The
 * existing supabase signed URL covers reads.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const pathParam = url.searchParams.get("path");
  if (!pathParam || !/^[\w\-./]+$/.test(pathParam)) {
    return new NextResponse("bad path", { status: 400 });
  }
  const localRoot =
    process.env.LOCAL_UPLOAD_ROOT || "/tmp/etihad-uploads";
  const target = path.join(localRoot, "media", pathParam);
  if (!existsSync(target)) {
    // Fallback to bundled /public/uploads/media if present
    const pub = path.join(process.cwd(), "public", "uploads", "media", pathParam);
    if (existsSync(pub)) {
      return streamFile(pub);
    }
    return new NextResponse("not found", { status: 404 });
  }
  return streamFile(target);
}

function streamFile(target: string): NextResponse {
  const buf = readFileSync(target);
  const lower = target.toLowerCase();
  const type = lower.endsWith(".png")
    ? "image/png"
    : lower.endsWith(".jpeg") || lower.endsWith(".jpg")
    ? "image/jpeg"
    : lower.endsWith(".webp")
    ? "image/webp"
    : lower.endsWith(".svg")
    ? "image/svg+xml"
    : lower.endsWith(".gif")
    ? "image/gif"
    : "application/octet-stream";
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": type,
      "Content-Length": String(buf.length),
      "Cache-Control": "public, max-age=300",
    },
  });
}
