import { NextResponse } from "next/server";
import { verifyHotmartSignature, type HotmartWebhookPayload } from "@/lib/hotmart";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("x-hotmart-webhook-token");

  if (!verifyHotmartSignature(payload, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: HotmartWebhookPayload;
  try {
    body = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
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

  const userId =
    authUser?.user?.id ??
    (await supabase.auth.admin.listUsers()).data.users.find(
      (u) => u.email === email
    )?.id;

  if (!userId) {
    return NextResponse.json({ error: "Could not resolve user id" }, { status: 500 });
  }

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Upsert en tabla users
  const { error: upsertError } = await supabase.from("users").upsert(
    {
      id: userId,
      email,
      full_name: name,
      hotmart_transaction_id: transaction,
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

  // Crear filas de day_progress para los 4 días
  const progressRows = [1, 2, 3, 4].map((day) => ({
    user_id: userId,
    day_number: day,
    is_unlocked: day === 1,
    is_completed: false,
  }));

  await supabase
    .from("day_progress")
    .upsert(progressRows, { onConflict: "user_id,day_number", ignoreDuplicates: true });

  // Enviar magic link de primer acceso
  await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    },
  });

  return NextResponse.json({ ok: true });
}
