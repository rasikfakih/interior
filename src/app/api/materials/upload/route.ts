import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { resolveAdminTenantId } from "@/lib/theme";
import { uploadObject } from "@/lib/storage";

/**
 * Material image upload (Module 4). Multipart form with one file
 * field. Accepts jpg / png / webp up to 10 MB (the material library
 * cap, tighter than the generic media 8 MB image cap because
 * catalogs hold many swatches). Writes to materials/{tenant}/{uuid}
 * and returns a displayable image_url for the material row.
 */
const MAX_MATERIAL_BYTES = 10 * 1024 * 1024;
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
    if (file.size > MAX_MATERIAL_BYTES) {
      return NextResponse.json(
        { error: `Image cap is ${MAX_MATERIAL_BYTES} bytes; got ${file.size}.` },
        { status: 400 }
      );
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "Empty file." }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const storagePath = `materials/${tenantId}/${crypto.randomUUID()}.${ext}`;
    const url = await uploadObject(storagePath, buf, mime);
    return NextResponse.json({ ok: true, image_url: url, storagePath });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || "Upload failed" }, { status: 400 });
  }
}
