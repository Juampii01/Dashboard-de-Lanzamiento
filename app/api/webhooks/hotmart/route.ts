import { NextResponse } from "next/server";
import {
  verifyHotmartSignature,
  validateHotmartTimestamp,
  type HotmartWebhookPayload,
} from "@/lib/hotmart";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("x-hotmart-webhook-token");

  // ── C7: HMAC verification ────────────────────────────────────────────────
  if (!verifyHotmartSignature(payload, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: HotmartWebhookPayload;
  try {
    body = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ── C7: Timestamp / replay-attack prevention ─────────────────────────────
  if (!validateHotmartTimestamp(body)) {
    console.warn("[hotmart] Webhook rejected: timestamp outside ±5 min window");
    return NextResponse.json(
      { error: "Timestamp out of allowed window" },
      { status: 401 }
    );
  }

  // Solo procesar compras aprobadas
  if (
    body.event !== "PURCHASE_APPROVED" &&
    body.event !== "PURCHASE_COMPLETE"
  ) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { email, name } = body.data.buyer;
  const { transaction } = body.data.purchase;

  const supabase = createServiceClient();

  // Crear usuario en Supabase Auth
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (authError && authError.message !== "User already registered") {
    console.error("Error creando usuario en Auth:", authError);
    return NextResponse.json({ error: "Auth error" }, { status: 500 });
  }

  // M3 fix: listUsers() only returns the first page (default: 50 users).
  // If createUser returned a user, use that id directly.
  // If the user already existed, query public.users by email (indexed,
  // O(1)) instead of scanning a potentially paginated auth.users list.
  let userId: string | undefined = authUser?.user?.id;
  if (!userId) {
    const { data: existingRow } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    userId = existingRow?.id;
  }

  if (!userId) {
    return NextResponse.json({ error: "Could not resolve user id" }, { status: 500 });
  }

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // ── C3: Upsert in users — hotmart_transaction_id persisted ──────────────
  const { error: upsertError } = await supabase.from("users").upsert(
    {
      id: userId,
      email,
      full_name: name,
      hotmart_transaction_id: transaction,   // saved → paywall proof
      access_starts_at: now,
      access_expires_at: expiresAt,
      is_admin: false,
      total_points: 0,
    },
    { onConflict: "id" }
  );

  if (upsertError) {
    console.error("Error upserting user:", upsertError);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  // Create placeholder day_progress rows for days that don't exist yet.
  // ignoreDuplicates: true so we never overwrite progress for repeat purchases.
  const progressRows = [1, 2, 3, 4].map((day) => ({
    user_id: userId,
    day_number: day,
    is_unlocked: day === 1,
    is_completed: false,
  }));

  await supabase
    .from("day_progress")
    .upsert(progressRows, { onConflict: "user_id,day_number", ignoreDuplicates: true });

  // ── C2 fix: Explicitly unlock Day 1 regardless of trigger state.
  //    The handle_new_user trigger now creates rows with is_unlocked = false.
  //    We must flip day 1 here to grant access after a verified purchase.
  //    We use a targeted UPDATE so we never touch is_completed for any day.
  const { error: unlockError } = await supabase
    .from("day_progress")
    .update({ is_unlocked: true })
    .eq("user_id", userId)
    .eq("day_number", 1);

  if (unlockError) {
    console.error("Error unlocking day 1:", unlockError);
    // Non-fatal: user row + expiry are correct; admin can manually unlock
  }

  // Enviar magic link de primer acceso
  await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://dboard.govbidder.net"}/dashboard`,
    },
  });

  return NextResponse.json({ ok: true });
}
