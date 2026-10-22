import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { autoClaimByAccountEmail } from "@/lib/access/purchases";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerificationPanel } from "./panel";

export const metadata = { title: "Estamos verificando tu compra — GovBidder Challenge" };
export const dynamic = "force-dynamic";

/**
 * Pantalla para cuentas registradas sin una compra que coincida con su email.
 * Vive FUERA de /dashboard para no volver a pasar por el gate del layout.
 */
export default async function EnVerificacionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as unknown as SupabaseClient<any, any, any>;
  const { data } = await db
    .from("users")
    .select("email, full_name, is_admin, is_student, hotmart_transaction_id, access_status, purchase_email_claim, verification_note")
    .eq("id", user.id)
    .maybeSingle();
  const p = data as {
    email: string;
    full_name: string | null;
    is_admin: boolean;
    is_student: boolean;
    hotmart_transaction_id: string | null;
    access_status: "pending" | "rejected" | null;
    purchase_email_claim: string | null;
    verification_note: string | null;
  } | null;

  if (!p) redirect("/login");
  if (p.is_admin || p.is_student || p.hotmart_transaction_id) redirect("/dashboard");
  if (p.access_status !== "pending" && p.access_status !== "rejected") redirect("/sin-acceso");

  // Puede que la compra se haya cargado después de que se registró: reintentar.
  if (p.access_status === "pending") {
    const r = await autoClaimByAccountEmail(db, user.id, p.email);
    if (r === "claimed") redirect("/dashboard");
  }

  const rejected = p.access_status === "rejected";

  return (
    <AuthShell
      eyebrow={rejected ? "Acceso no confirmado" : "Cuenta en verificación"}
      title={rejected ? "No encontramos tu compra" : "Estamos verificando tu compra"}
      subtitle={
        rejected ? (
          <>El equipo revisó tu cuenta <strong className="text-[#0d1a3d]">{p.email}</strong> y no encontró una compra asociada. Si crees que es un error, escríbenos.</>
        ) : (
          <>Tu cuenta <strong className="text-[#0d1a3d]">{p.email}</strong> está creada, pero no encontramos una compra hecha con ese email. Quizás compraste con otro.</>
        )
      }
    >
      <VerificationPanel
        rejected={rejected}
        initialPurchaseEmail={p.purchase_email_claim ?? ""}
        initialNote={p.verification_note ?? ""}
        alreadySent={!!(p.purchase_email_claim || p.verification_note)}
      />
    </AuthShell>
  );
}
