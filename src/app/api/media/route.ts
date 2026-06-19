import { NextRequest, NextResponse } from "next/server";
import "server-only";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireLicense } from "@/lib/license-gate";
import {
  insertMedia,
  listMedia,
  type MediaKind,
} from "@/lib/media";

const ALLOWED_IMAGE_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
  "image/svg+xml",
]);
const ALLOWED_MODEL_MIME = new Set(["model/gltf-binary", "model/gltf", "application/octet-stream"]);
const ALLOWED_DOC_MIME = new Set(["application/pdf"]);

const MAX_IMAGE = 8 * 1024 * 1024;
const MAX_MODEL = 50 * 1024 * 1024;
const MAX_DOC = 8 * 1024 * 1024;

function detectKind(mime: string, folder: string): MediaKind {
  if (folder === "models" || mime.startsWith("model/gltf")) return "model";
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "document";
  return "other";
}

function safeName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

function extForMime(mime: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/svg+xml": "svg",
    "model/gltf-binary": "glb",
    "model/gltf": "gltf",
    "application/octet-stream": "bin",
    "application/pdf": "pdf",
  };
  return map[mime] || "bin";
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const kind = (url.searchParams.get("kind") || "all") as MediaKind | "all";
  try {
    const items = await listMedia({ q, kind, limit: 200 });
    return NextResponse.json(items);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
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
    const folder = ((form.get("folder") as string) || "").toLowerCase();
    const alt = (form.get("alt") as string) || null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const mime = file.type;
    const kind = detectKind(mime, folder);
    const max = kind === "model" ? MAX_MODEL : kind === "document" ? MAX_DOC : MAX_IMAGE;
    if (file.size > max) {
      return NextResponse.json(
        { error: `File exceeds ${Math.round(max / (1024 * 1024))}MB limit` },
        { status: 400 }
      );
    }
    const allowed =
      kind === "image"
        ? ALLOWED_IMAGE_MIME
        : kind === "model"
        ? ALLOWED_MODEL_MIME
        : kind === "document"
        ? ALLOWED_DOC_MIME
        : new Set<string>();
    if (!allowed.has(mime)) {
      return NextResponse.json(
        { error: `Unsupported file type for ${kind}` },
        { status: 400 }
      );
    }

    const ext = extForMime(mime);
    const base = safeName(file.name.split(".").slice(0, -1).join(".")) || "asset";
    const filename = `${Date.now()}-${randomUUID()}-${base}.${ext}`;
    const subfolder = kind === "model" ? "models" : kind === "document" ? "documents" : "images";
    const uploadDir = path.join(process.cwd(), "public", "uploads", subfolder);
    await mkdir(uploadDir, { recursive: true });
    const buf = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buf);
    const url = `/uploads/${subfolder}/${filename}`;

    const id = await insertMedia({
      kind,
      mime,
      size: file.size,
      originalName: file.name,
      storagePath: filePath,
      url,
      alt,
      width: null,
      height: null,
    });
    return NextResponse.json({
      success: true,
      id,
      url,
      kind,
      filename,
      size: file.size,
      mime,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
