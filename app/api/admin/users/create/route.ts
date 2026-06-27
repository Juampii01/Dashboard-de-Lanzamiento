import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendAccessEmail } from "@/lib/email/send-access-email";
import { buildMagicLinkUrl } from "@/lib/auth/magic-link";
import { REFERRAL_LEAD_XP } from "@/lib/referrals";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const userSchema = z.object({
  email: z.string().email().max(255),
  full_name: z.string().max(200).optional().nullable(),
  phone: z
    .string()
    .regex(/^\+?[0-9\s\-()·]{8,20}$/)
    .optional()
    .nullable(),
  expires_at: z.string().datetime().optional().nullable(),
  is_admin: z.boolean().optional().default(false),
  notes: z.string().max(500).optional().nullable(),
});

const requestSchema = z.union([
  userSchema,
  z.object({ users: z.array(userSchema).min(1).max(200) }),
]);

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  // 1. Auth check — caller must be authenticated admin
  const supabase = await createClient();
  const {
    data: { user: caller },
  } = await supabase.auth.getUser();

  if (!caller) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: callerProfile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", caller.id)
    .single();

  if (!callerProfile?.is_admin) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  // 2. Parse + validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid_payload", details: parsed.error.issues },
      { status: 400 }
    );
  }

  type SingleUser = z.infer<typeof userSchema>;
  type BulkPayload = { users: SingleUser[] };
  const data = parsed.data as SingleUser | BulkPayload;
  const isBulk = "users" in data;
  const usersToCreate: SingleUser[] = isBulk
    ? (data as BulkPayload).users
    : [data as SingleUser];
  const source = isBulk ? "bulk_csv" : "single";

  // 3. Service role client for admin operations
  const admin = createServiceClient();

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://dboard.govbidder.net";

  type Result = {
    email: string;
    status: "ok" | "error";
    error?: string;
    user_id?: string;
    email_sent?: boolean;
    magic_link?: string | null;
  };

  const results: Result[] = [];

  for (const userData of usersToCreate) {
    let newUserId: string | null = null;

    try {
      // Default expires_at → now + 30 days
      const expiresAt = userData.expires_at
        ? new Date(userData.expires_at)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // 4a. Create auth user (triggers handle_new_user which creates public.users row)
      // Seteamos el display_name en la metadata de auth para que aparezca en el
      // panel de Auth de Supabase (la app igual usa public.users.full_name).
      const fn = userData.full_name?.trim() || null;
      const { data: createData, error: createError } =
        await admin.auth.admin.createUser({
          email: userData.email,
          email_confirm: true,
          user_metadata: fn ? { display_name: fn, full_name: fn } : {},
        });

      if (createError) {
        throw new Error(createError.message);
      }

      newUserId = createData.user.id;

      const syntheticTxnId = `MANUAL-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      // 4b. Update public.users with additional fields
      // (trigger already inserted id + email; we add the rest)
      const { error: updateError } = await admin
        .from("users")
        .update({
          full_name: userData.full_name ?? null,
          phone: userData.phone ?? null,
          hotmart_transaction_id: syntheticTxnId,
          access_starts_at: new Date().toISOString(),
          access_expires_at: expiresAt.toISOString(),
          is_admin: userData.is_admin ?? false,
        })
        .eq("id", newUserId);

      if (updateError) {
        // Rollback: delete the auth user to avoid zombie accounts
        await admin.auth.admin.deleteUser(newUserId);
        newUserId = null;
        throw new Error(`DB update failed: ${updateError.message}`);
      }

      // 4c. Unlock Day 1 (trigger created all rows locked)
      await admin
        .from("day_progress")
        .update({ is_unlocked: true })
        .eq("user_id", newUserId)
        .eq("day_number", 1);

      // 4c-bis. Si este email fue referido (formulario público), acreditar al
      // referidor +REFERRAL_LEAD_XP. Solo una vez (credited_at) y nunca a sí mismo.
      try {
        const emailLc = userData.email.trim().toLowerCase();
        const { data: lead } = await admin
          .from("referral_leads")
          .select("id, referrer_id, credited_at")
          .eq("referred_email", emailLc)
          .maybeSingle();
        const l = lead as { id: string; referrer_id: string; credited_at: string | null } | null;
        if (l && !l.credited_at && l.referrer_id !== newUserId) {
          await admin.rpc("add_points", { p_user_id: l.referrer_id, p_delta: REFERRAL_LEAD_XP, p_category: "referral" });
          await admin
            .from("referral_leads")
            .update({ credited_at: new Date().toISOString(), xp_awarded: REFERRAL_LEAD_XP } as Record<string, unknown>)
            .eq("id", l.id);
        }
      } catch (e) {
        console.warn(`[create-user] referral credit failed for ${userData.email}:`, e);
      }

      // 4d. Generate + send magic link
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: userData.email,
        options: { redirectTo: `${appUrl}/auth/confirm` },
      });

      const magicLink = buildMagicLinkUrl(
        appUrl,
        (linkData as { properties?: { hashed_token?: string; verification_type?: string } } | null)?.properties
      );

      // generateLink NO envía email — lo mandamos explícitamente por Resend.
      let emailSent = false;
      if (linkError || !magicLink) {
        console.warn(
          `[create-user] magic link gen failed for ${userData.email}:`,
          linkError?.message
        );
      } else {
        const sent = await sendAccessEmail({ to: userData.email, magicLink, appUrl });
        emailSent = sent.ok;
        if (!sent.ok) {
          console.warn(`[create-user] Resend send failed for ${userData.email}: ${sent.error}`);
        }
      }
      // Non-fatal si falla: el usuario igual se crea y devolvemos magic_link de fallback.

      // 4e. Audit log — success
      await admin.from("admin_user_creation_log").insert({
        created_by: caller.id,
        target_user_id: newUserId,
        target_email: userData.email,
        source,
        status: "ok",
        notes: userData.notes ?? null,
      });

      results.push({
        email: userData.email,
        status: "ok",
        user_id: newUserId,
        email_sent: emailSent,
        magic_link: magicLink,
      });
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "unknown_error";

      // Audit log — failure
      await admin.from("admin_user_creation_log").insert({
        created_by: caller.id,
        target_user_id: newUserId ?? null,
        target_email: userData.email,
        source,
        status: "error",
        error_message: errorMsg,
        notes: userData.notes ?? null,
      });

      results.push({ email: userData.email, status: "error", error: errorMsg });
    }

    // Rate-limit guard: Supabase Auth allows ~30 req/s → 100ms headroom
    await new Promise((r) => setTimeout(r, 100));
  }

  const okCount = results.filter((r) => r.status === "ok").length;
  const errorCount = results.filter((r) => r.status === "error").length;

  return Response.json({
    total: results.length,
    created: okCount,
    errors: errorCount,
    results,
  });
}
