import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireLicense } from "@/lib/license-gate";

const ALLOWED_FOLDERS = new Set(["images", "models"]);
const ALLOWED_IMAGE_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
]);
const ALLOWED_MODEL_MIME = new Set(["model/gltf-binary", "model/gltf"]);
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_MODEL_BYTES = 25 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/avif": "avif",
  "model/gltf-binary": "glb",
  "model/gltf": "gltf",
};

function safeName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await requireLicense("admin");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: gate.code });
  }
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const folder = ((form.get("folder") as string) || "images").toLowerCase();

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (!ALLOWED_FOLDERS.has(folder)) {
      return NextResponse.json(
        { error: "Folder must be one of: images, models" },
        { status: 400 }
      );
    }

    const maxBytes = folder === "models" ? MAX_MODEL_BYTES : MAX_IMAGE_BYTES;
    if (file.size > maxBytes) {
      return NextResponse.json(
        {
          error: `File exceeds ${
            folder === "models" ? "25MB" : "6MB"
          } limit`,
        },
        { status: 400 }
      );
    }

    const mime = file.type;
    const allowedMime =
      folder === "models" ? ALLOWED_MODEL_MIME : ALLOWED_IMAGE_MIME;
    if (!allowedMime.has(mime)) {
      return NextResponse.json(
        { error: `Unsupported file type for ${folder}` },
        { status: 400 }
      );
    }

    const ext = EXT_BY_MIME[mime];
    const base = safeName(file.name.split(".").slice(0, -1).join("."));
    const filename = `${Date.now()}-${randomUUID()}-${base || "asset"}.${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, filename);

    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buf);

    return NextResponse.json({
      success: true,
      url: `/uploads/${folder}/${filename}`,
      filename,
      size: file.size,
      mime,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
