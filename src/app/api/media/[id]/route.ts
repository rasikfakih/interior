import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { unlink } from "fs/promises";
import { getMediaById, updateMediaAlt, deleteMedia } from "@/lib/media";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = await getMediaById(Number(id));
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const body = await req.json();
    if (typeof body.alt === "string") {
      await updateMediaAlt(Number(id), body.alt.slice(0, 500));
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const numId = Number(id);
  const result = await deleteMedia(numId);
  if (!result.ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (result.file) {
    try {
      await unlink(result.file);
    } catch {}
  }
  return NextResponse.json({ success: true });
}
