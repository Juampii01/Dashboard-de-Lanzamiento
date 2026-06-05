import { NextResponse } from "next/server";

// Combo system removed.
export async function POST() {
  return NextResponse.json({ removed: true }, { status: 410 });
}
