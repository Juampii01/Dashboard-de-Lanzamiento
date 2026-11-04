/**
 * Helpers de servidor para las rutas de On Demand (misiones fijas y premios).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getUserProgram } from "@/lib/program-server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = SupabaseClient<any, any, any>;

/** Usuario con sesión del programa on demand (los admins también pasan, para probar). */
export async function requireOndemandUser(): Promise<
  { ok: true; userId: string; isAdmin: boolean; db: Db } | { ok: false; status: number; error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "unauthorized" };
  const db = createServiceClient() as unknown as Db;
  const { data } = await db.from("users").select("is_admin").eq("id", user.id).maybeSingle();
  const isAdmin = (data as { is_admin?: boolean } | null)?.is_admin === true;
  if (!isAdmin && (await getUserProgram(user.id)) !== "ondemand") {
    return { ok: false, status: 403, error: "only_ondemand" };
  }
  return { ok: true, userId: user.id, isAdmin, db };
}

/** Admin con sesión (para /api/admin/ondemand/*). */
export async function requireAdmin(): Promise<{ ok: true; adminId: string; db: Db } | { ok: false }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const db = createServiceClient() as unknown as Db;
  const { data } = await db.from("users").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(data as { is_admin?: boolean } | null)?.is_admin) return { ok: false };
  return { ok: true, adminId: user.id, db };
}

/** "relation does not exist" / "column does not exist": falta correr la migración. */
export function isMigrationMissing(err: { code?: string } | null | undefined): boolean {
  return err?.code === "42P01" || err?.code === "42703";
}

export function detectImageType(buf: Buffer): string | null {
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return "image/webp";
  return null;
}
