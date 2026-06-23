import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = (body.email || "").toString().trim();
  const password = (body.password || "").toString();
  const superadminEmail = process.env.SUPERADMIN_EMAIL || "";
  const superadminPassword = process.env.SUPERADMIN_PASSWORD || "";

  if (!superadminEmail || !superadminPassword) {
    return NextResponse.json(
      { ok: false, error: "SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD env vars must be set" },
      { status: 500 }
    );
  }

  if (email !== superadminEmail || password !== superadminPassword) {
    return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set("superadmin_session", "1", {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("superadmin_session");
  return NextResponse.json({ ok: true });
}
