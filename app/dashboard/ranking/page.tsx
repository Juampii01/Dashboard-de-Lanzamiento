import { createClient, createServiceClient } from "@/lib/supabase/server";
import { RankingClient } from "./client";
import { redirectOndemandToHome } from "@/lib/program-server";
import { getActor } from "@/lib/viewer";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const DEV_MODE = !(SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("placeholder"));

export default async function RankingPage() {
  // El ranking es solo del en vivo.
  if (!DEV_MODE) await redirectOndemandToHome();

  let isStudent = false;
  let studentPoints = 0;
  let isAdmin = false;

  if (!DEV_MODE) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const actor = await getActor(user.id);
      // Tolera que la columna is_student aún no exista (deploy antes de migrar):
      // si falla el select, profile = null → isStudent = false (comportamiento normal).
      const { data: profile } = await createServiceClient()
        .from("users")
        .select("is_student, total_points, is_admin")
        .eq("id", actor.userId)
        .maybeSingle();
      isStudent = (profile as { is_student?: boolean } | null)?.is_student === true;
      studentPoints = (profile as { total_points?: number } | null)?.total_points ?? 0;
      isAdmin = (profile as { is_admin?: boolean } | null)?.is_admin === true;
    }
  }

  // myPoints: los admins (y alumnos) no figuran en el ranking público, así que
  // sus puntos se leen aquí para que igual vean su rango.
  return <RankingClient isStudent={isStudent} studentPoints={studentPoints} myPoints={studentPoints} isAdmin={isAdmin} />;
}
