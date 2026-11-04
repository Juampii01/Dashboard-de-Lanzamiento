/**
 * Grabaciones de las clases por programa (solo servidor).
 *
 *   recording_number 1..4 → clase de cada día
 *   recording_number 0    → video introductorio (solo on demand)
 *
 * Tolerante: si la migración 20261104000001 (columna program) todavía no
 * corrió, devuelve las grabaciones de siempre para el en vivo y nada para on
 * demand.
 */
import { createServiceClient } from "@/lib/supabase/server";
import type { Program } from "@/lib/program";

export interface Recording {
  url: string | null;
  title: string | null;
}

export async function getRecordings(program: Program): Promise<Record<number, Recording>> {
  const service = createServiceClient();
  const out: Record<number, Recording> = {};

  const withProgram = await service
    .from("class_recordings")
    .select("recording_number, youtube_url, title, program")
    .eq("program", program);

  let rows = withProgram.data as { recording_number: number; youtube_url: string | null; title?: string | null }[] | null;
  if (withProgram.error) {
    if (program === "ondemand") return out;
    const legacy = await service.from("class_recordings").select("recording_number, youtube_url, title");
    rows = legacy.error
      ? ((await service.from("class_recordings").select("recording_number, youtube_url")).data as typeof rows)
      : (legacy.data as typeof rows);
  }

  for (const r of rows ?? []) {
    out[r.recording_number] = { url: r.youtube_url ?? null, title: r.title ?? null };
  }
  return out;
}

/** ID de YouTube desde cualquier formato de link (watch, youtu.be, embed, shorts, live). */
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : /^[A-Za-z0-9_-]{11}$/.test(url.trim()) ? url.trim() : null;
}
