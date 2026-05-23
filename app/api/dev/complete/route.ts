import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { day } = await req.json();
  const existing = req.cookies.get("dev_completed")?.value ?? "";
  const days = new Set(existing.split(",").filter(Boolean));
  days.add(String(day));
  const res = NextResponse.json({ ok: true });
  res.cookies.set("dev_completed", Array.from(days).join(","), { path: "/" });
  return res;
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("dev_completed", "", { path: "/", maxAge: 0 });
  return res;
}
