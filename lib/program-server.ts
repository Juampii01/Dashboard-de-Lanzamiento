/**
 * Helpers de programa que dependen del request o de la base (solo servidor).
 * Ver lib/program.ts para la explicación de los programas.
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { hostForProgram, isProgram, programFromHost, type Program } from "@/lib/program";

/** Host del request actual (respeta el proxy de Vercel). */
export async function requestHost(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0].trim().toLowerCase();
}

/** Programa según el dominio por el que entró la persona. */
export async function requestProgram(): Promise<Program> {
  return programFromHost(await requestHost());
}

/**
 * Programa de la cuenta. Tolerante: si la migración 20261103000001 todavía no
 * corrió (no existe la columna), devuelve "live" y todo sigue como antes.
 */
export async function getUserProgram(userId: string): Promise<Program> {
  const { data, error } = await createServiceClient()
    .from("users")
    .select("program")
    .eq("id", userId)
    .maybeSingle();
  if (error) return "live";
  const p = (data as { program?: string } | null)?.program;
  return isProgram(p) ? p : "live";
}

/**
 * true si el host es uno de los dominios oficiales (dboard / ondemand). En
 * previews de Vercel y localhost no se redirige entre dominios, para poder
 * probar cualquier programa.
 */
export function isCanonicalHost(host: string): boolean {
  return host === hostForProgram("live") || host === hostForProgram("ondemand");
}

/**
 * Para páginas que solo existen en el en vivo (ranking, misiones extra): si la
 * persona es de on demand, vuelve al Inicio. No hace nada sin sesión (el layout
 * ya se encarga de mandar al login).
 */
export async function redirectOndemandToHome(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  if ((await getUserProgram(user.id)) === "ondemand") redirect("/dashboard");
}

/**
 * Para páginas que solo existen en on demand (misiones fijas, premios): si la
 * persona es del en vivo, vuelve al Inicio. Los admins pasan (para revisar).
 */
export async function redirectLiveToHome(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data } = await createServiceClient().from("users").select("is_admin").eq("id", user.id).maybeSingle();
  if ((data as { is_admin?: boolean } | null)?.is_admin) return;
  if ((await getUserProgram(user.id)) !== "ondemand") redirect("/dashboard");
}
