import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { uploadObject } from "@/lib/storage";
import { resolveAdminTenantId } from "@/lib/theme";

/**
 * Module 7 - site diary photo upload. Multipart form with
 * { client_project_id, file }. Accepts jpg / png / webp up to 10 MB.
 * Writes to site-photos/{tenant_id}/{client_project_id}/{uuid}.{ext}
 * and returns a displayable photo_url. Does NOT create a log - the
 * frontend collects urls, then POSTs /api/site-logs with the photos
 * array (so offline queued logs can re-upload on sync).
 */
const MAX_SITE_PHOTO_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(req: NextRequest) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;
  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }
  try {
    const form = await req.formData();
    const clientProjectId = String(form.get("client_project_id") ?? "").trim();
    if (!clientProjectId) {
      return NextResponse.json(
        { error: "client_project_id is required." },
        { status: 400 }
      );
    }
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file field is required." }, { status: 400 });
    }
    const mime = (file.type || "").toLowerCase();
    const ext = ALLOWED_MIME[mime];
    if (!ext) {
      return NextResponse.json(
        { error: "Only jpg, png or webp images are allowed." },
        { status: 400 }
      );
    }
    if (file.size > MAX_SITE_PHOTO_BYTES) {
      return NextResponse.json(
        { error: `Photo cap is ${MAX_SITE_PHOTO_BYTES} bytes; got ${file.size}.` },
        { status: 400 }
      );
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "Empty file." }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const storagePath = `site-photos/${tenantId}/${clientProjectId}/${crypto.randomUUID()}.${ext}`;
    const url = await uploadObject(storagePath, buf, mime, "site-photos");
    return NextResponse.json({ ok: true, photo_url: url, storagePath });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || "Upload failed" }, { status: 400 });
  }
}
