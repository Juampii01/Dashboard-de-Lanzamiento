import { redirectLiveToHome } from "@/lib/program-server";
import { RewardsClient } from "./client";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const DEV_MODE = !(SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("placeholder"));

/** Premios por puntos de On Demand (el en vivo usa /dashboard/ranking). */
export default async function PremiosPage() {
  if (!DEV_MODE) await redirectLiveToHome();
  return <RewardsClient />;
}
