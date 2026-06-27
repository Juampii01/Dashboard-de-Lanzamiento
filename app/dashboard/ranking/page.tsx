import { createClient, createServiceClient } from "@/lib/supabase/server";
import { RankingClient } from "./client";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const DEV_MODE = !(SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("placeholder"));

export default async function RankingPage() {
  let isStudent = false;
  let studentPoints = 0;

  if (!DEV_MODE) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Tolera que la columna is_student aún no exista (deploy antes de migrar):
      // si falla el select, profile = null → isStudent = false (comportamiento normal).
      const { data: profile } = await createServiceClient()
        .from("users")
        .select("is_student, total_points")
        .eq("id", user.id)
        .maybeSingle();
      isStudent = (profile as { is_student?: boolean } | null)?.is_student === true;
      studentPoints = (profile as { total_points?: number } | null)?.total_points ?? 0;
    }
  }

  return <RankingClient isStudent={isStudent} studentPoints={studentPoints} />;
}
