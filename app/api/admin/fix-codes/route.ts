import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { fixCode, fixNaics, fixPsc, type CodeType } from "@/lib/codes/official";

// Corrección única de los códigos ya guardados (Día 2 y Capability Statement)
// contra el PSC Manual abril 2025 y NAICS 2022. Solo admin.
// POST { dryRun: true } → solo cuenta cambios; { dryRun: false } → guarda.

type Code = { code: string; description: string; type?: string };

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const service = createServiceClient();
  const { data } = await service.from("users").select("is_admin").eq("id", user.id).maybeSingle();
  return (data as { is_admin?: boolean } | null)?.is_admin ? service : null;
}

function dedupe<T extends { code: string; type?: string }>(list: T[]): T[] {
  const seen = new Set<string>();
  return list.filter((c) => {
    const k = `${c.type ?? ""}:${c.code}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const TYPES = new Set(["NAICS", "PSC", "SIC", "UNSPSC", "NIGP"]);

function fixRelated(codes: Code[], primaryNaics: string): Code[] {
  const out: Code[] = [];
  for (const c of codes ?? []) {
    const type = String(c?.type ?? "");
    if (!TYPES.has(type)) { out.push(c); continue; }
    const f = fixCode(type as CodeType, String(c.code ?? ""), String(c.description ?? ""));
    if (f) out.push({ ...f, type });
    else if (type === "NAICS" && String(c.code) === primaryNaics) out.push(c);
  }
  return dedupe(out);
}

export async function POST(req: Request) {
  const service = await requireAdmin();
  if (!service) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { dryRun = true } = (await req.json().catch(() => ({}))) as { dryRun?: boolean };
  return run(service, dryRun);
}

// TEMPORAL — se quita apenas corre: GET ?token=<FIX_CODES_TOKEN>&apply=1
export async function GET(req: Request) {
  const url = new URL(req.url);
  const expected = process.env.FIX_CODES_TOKEN;
  if (!expected || url.searchParams.get("token") !== expected) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return run(createServiceClient(), url.searchParams.get("apply") !== "1");
}

async function run(service: ReturnType<typeof createServiceClient>, dryRun: boolean) {

  const stats: Record<string, number> = { maps: 0, mapsChanged: 0, statements: 0, statementsChanged: 0 };
  const pscByUser = new Map<string, Code[]>();

  const { data: maps, error: mErr } = await service
    .from("naics_expansions")
    .select("id, user_id, primary_naics, related_codes");
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  for (const m of (maps ?? []) as { id: string; user_id: string; primary_naics: string; related_codes: Code[] }[]) {
    stats.maps++;
    const before = m.related_codes ?? [];
    const after = fixRelated(before, String(m.primary_naics ?? ""));
    for (const c of before) stats[`${c?.type}_antes`] = (stats[`${c?.type}_antes`] ?? 0) + 1;
    for (const c of after) stats[`${c.type}_despues`] = (stats[`${c.type}_despues`] ?? 0) + 1;
    pscByUser.set(m.user_id, after.filter((c) => c.type === "PSC"));
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      stats.mapsChanged++;
      if (!dryRun) {
        await service.from("naics_expansions").update({ related_codes: after }).eq("id", m.id);
      }
    }
  }

  const { data: sts, error: sErr } = await service
    .from("capability_statements")
    .select("id, user_id, statement_data");
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  for (const s of (sts ?? []) as { id: string; user_id: string; statement_data: Record<string, unknown> | null }[]) {
    stats.statements++;
    const d = s.statement_data;
    if (!d) continue;
    const dayTwo = pscByUser.get(s.user_id) ?? [];
    const allowed = new Set(dayTwo.map((c) => c.code));

    let psc = dedupe(((d.psc_with_desc as Code[]) ?? [])
      .map((c) => fixPsc(String(c?.code ?? ""), String(c?.description ?? "")))
      .filter((c): c is Code => !!c && (!allowed.size || allowed.has(c.code))));
    if (!psc.length) psc = dayTwo.map(({ code, description }) => ({ code, description }));
    psc = psc.slice(0, 4);

    const naics = dedupe(((d.naics_with_desc as Code[]) ?? [])
      .map((c) => fixNaics(String(c?.code ?? "")))
      .filter((c): c is Code => !!c)).slice(0, 5);

    const next = {
      ...d,
      psc_with_desc: psc,
      psc_codes: psc.map((c) => c.code),
      naics_with_desc: naics.length ? naics : d.naics_with_desc,
      naics_codes: naics.length ? naics.map((c) => c.code) : d.naics_codes,
    };
    if (JSON.stringify(next) !== JSON.stringify(d)) {
      stats.statementsChanged++;
      if (!dryRun) {
        await service.from("capability_statements").update({ statement_data: next }).eq("id", s.id);
      }
    }
  }

  return NextResponse.json({ ok: true, dryRun, stats });
}
