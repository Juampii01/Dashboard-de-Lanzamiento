import { redirectLiveToHome } from "@/lib/program-server";
import { OndemandMissionsClient } from "./client";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const DEV_MODE = !(SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("placeholder"));

/** Misiones fijas de On Demand (en el en vivo existe /dashboard/suma-puntos). */
export default async function MisionesPage() {
  if (!DEV_MODE) await redirectLiveToHome();
  return <OndemandMissionsClient />;
}
