import type { SupabaseClient } from "@supabase/supabase-js";

export interface AdminToggleRow {
  day_number: number;
  is_globally_unlocked: boolean;
  unlocked_at: string | null;
  updated_at: string;
}

export async function getAdminToggle(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  dayNumber: number
): Promise<AdminToggleRow | null> {
  const { data } = await supabase
    .from("admin_toggles")
    .select("*")
    .eq("day_number", dayNumber)
    .single();
  return data as AdminToggleRow | null;
}

export async function getAllAdminToggles(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<AdminToggleRow[]> {
  const { data } = await supabase
    .from("admin_toggles")
    .select("*")
    .order("day_number");
  return (data ?? []) as AdminToggleRow[];
}
