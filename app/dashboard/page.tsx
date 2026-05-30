import { createClient, createServiceClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { HomeClient } from "./home-client";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
function isSupabaseConfigured() {
  return (
    SUPABASE_URL.startsWith("https://") &&
    !SUPABASE_URL.includes("placeholder")
  );
}

export default async function DashboardPage() {
  const devMode = !isSupabaseConfigured();

  let initialPoints = 0;
  let fullName = "Usuario";
  let avatarUrl: string | null = null;

  if (devMode) {
    // Dev mode — use cookie-based completed days, no real auth
    await cookies(); // satisfy dynamic rendering
    fullName = "Dev Preview";
    initialPoints = 0;
  } else {
    const supabase = await createClient();
    let user = null;
    try {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch {
      // Network unreachable
    }
    if (!user) redirect("/login");

    const { data: profile } = await createServiceClient()
      .from("users")
      .select("full_name, total_points, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    fullName = profile?.full_name ?? "Usuario";
    initialPoints = (profile?.total_points as number | null) ?? 0;
    avatarUrl = (profile as { avatar_url?: string | null })?.avatar_url ?? null;
  }

  return (
    <HomeClient
      initialPoints={initialPoints}
      fullName={fullName}
      devMode={devMode}
      avatarUrl={avatarUrl}
    />
  );
}
