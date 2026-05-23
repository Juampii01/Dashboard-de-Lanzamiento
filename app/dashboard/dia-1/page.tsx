import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAdminToggle } from "@/lib/supabase/helpers";
import { Dia1Client } from "./client";
import { VideoCapsules } from "@/components/video-capsules";
import Link from "next/link";

async function getDia1Data(userId: string) {
  const supabase = await createClient();

  const [toggle, { data: progress }, { data: profile }] =
    await Promise.all([
      getAdminToggle(supabase, 1),
      supabase
        .from("day_progress")
        .select("is_unlocked, is_completed")
        .eq("user_id", userId)
        .eq("day_number", 1)
        .single(),
      supabase
        .from("company_profiles")
        .select("*")
        .eq("user_id", userId)
        .single(),
    ]);

  return { progress, profile, toggle };
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const DEV_MODE = !(SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("placeholder"));

export default async function Dia1Page() {
  if (DEV_MODE) {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const devCompleted = cookieStore.get("dev_completed")?.value ?? "";
    const isDone = devCompleted.split(",").includes("1");
    return (
      <div className="space-y-8">
        <Dia1Client userId="dev" isCompleted={isDone} existingProfile={null} devMode />
        <VideoCapsules day={1} />
      </div>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { progress, profile, toggle } = await getDia1Data(user.id);

  const isUnlocked =
    toggle?.is_globally_unlocked === true || progress?.is_unlocked === true;

  if (!isUnlocked) redirect("/dashboard");

  return (
    <div className="space-y-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm transition-colors"
        style={{ color: "#A8B5CC", fontFamily: "var(--font-sans)" }}
      >
        ← Dashboard
      </Link>
      <Dia1Client
        userId={user.id}
        isCompleted={progress?.is_completed ?? false}
        existingProfile={profile}
      />
      <VideoCapsules day={1} />
    </div>
  );
}
