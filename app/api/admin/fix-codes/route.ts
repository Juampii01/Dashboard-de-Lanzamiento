import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { fixNaics, fixPsc } from "@/lib/codes/official";

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

function fixRelated(codes: Code[], primaryNaics: string): Code[] {
  const out: Code[] = [];
  for (const c of codes ?? []) {
    if (c?.type === "PSC") {
      const f = fixPsc(String(c.code ?? ""), String(c.description ?? ""));
      if (f) out.push({ ...f, type: "PSC" });
    } else if (c?.type === "NAICS") {
      const f = fixNaics(String(c.code ?? ""));
      if (f) out.push({ ...f, type: "NAICS" });
      else if (String(c.code) === primaryNaics) out.push(c);
    } else {
      out.push(c);
    }
  }
  return dedupe(out);
}

export async function POST(req: Request) {
  const service = await requireAdmin();
  if (!service) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { dryRun = true } = (await req.json().catch(() => ({}))) as { dryRun?: boolean };
  return run(service, dryRun);
}

async function run(service: ReturnType<typeof createServiceClient>, dryRun: boolean) {

  const stats = { maps: 0, mapsChanged: 0, pscBefore: 0, pscAfter: 0, statements: 0, statementsChanged: 0 };
  const pscByUser = new Map<string, Code[]>();

  const { data: maps, error: mErr } = await service
    .from("naics_expansions")
    .select("id, user_id, primary_naics, related_codes");
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  for (const m of (maps ?? []) as { id: string; user_id: string; primary_naics: string; related_codes: Code[] }[]) {
    stats.maps++;
    const before = m.related_codes ?? [];
    const after = fixRelated(before, String(m.primary_naics ?? ""));
    stats.pscBefore += before.filter((c) => c?.type === "PSC").length;
    stats.pscAfter += after.filter((c) => c.type === "PSC").length;
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
