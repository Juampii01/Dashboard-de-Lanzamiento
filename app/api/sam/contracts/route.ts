import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SAM_SEARCH = "https://api.sam.gov/opportunities/v2/search";

// Realistic sector data by NAICS prefix — used when SAM_GOV_API_KEY is not configured
const SECTOR_DATA: Record<string, { amount: number; count: number; sector: string }> = {
  "5415": { amount: 4_800_000_000, count: 2_341, sector: "Tecnología de la Información" },
  "5416": { amount: 3_200_000_000, count: 1_892, sector: "Consultoría y Gestión" },
  "5413": { amount: 2_900_000_000, count: 1_203, sector: "Servicios de Arquitectura e Ingeniería" },
  "5412": { amount: 1_800_000_000, count: 876, sector: "Servicios de Contabilidad y Auditoría" },
  "6211": { amount: 7_100_000_000, count: 3_450, sector: "Servicios Médicos" },
  "2362": { amount: 9_400_000_000, count: 4_210, sector: "Construcción de Edificios No Residenciales" },
  "5311": { amount: 2_100_000_000, count: 980, sector: "Arrendamiento de Bienes Raíces" },
  "4811": { amount: 5_600_000_000, count: 1_102, sector: "Transporte Aéreo" },
  "3341": { amount: 6_300_000_000, count: 2_780, sector: "Manufactura de Computadoras" },
};

function matchSector(naics: string) {
  for (const prefix of Object.keys(SECTOR_DATA)) {
    if (naics.startsWith(prefix)) return SECTOR_DATA[prefix];
  }
  return { amount: 1_400_000_000, count: 620, sector: "Servicios Profesionales" };
}

function dateNDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getFullYear()}`;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();

    let naicsCodes: string[] = [];

    if (auth.user) {
      const { data: profile } = await supabase
        .from("company_profiles")
        .select("primary_naics")
        .eq("user_id", auth.user.id)
        .maybeSingle();

      if (profile?.primary_naics) naicsCodes.push(profile.primary_naics);

      const { data: expansion } = await supabase
        .from("naics_expansions")
        .select("related_codes")
        .eq("user_id", auth.user.id)
        .maybeSingle();

      if (Array.isArray(expansion?.related_codes)) {
        const extras = (expansion.related_codes as Array<{ code?: string; naics_code?: string }>)
          .slice(0, 3)
          .map((c) => c.code ?? c.naics_code ?? "")
          .filter(Boolean);
        naicsCodes.push(...extras);
      }
    }

    if (naicsCodes.length === 0) naicsCodes = ["541511"];
    const primary = naicsCodes[0];

    const apiKey = process.env.SAM_GOV_API_KEY;
    if (apiKey) {
      try {
        const params = new URLSearchParams({
          api_key: apiKey,
          naicsCode: primary,
          limit: "3",
          postedFrom: dateNDaysAgo(30),
          active: "Yes",
        });
        const res = await fetch(`${SAM_SEARCH}?${params}`, {
          next: { revalidate: 3600 },
        });
        if (res.ok) {
          const json = await res.json();
          return NextResponse.json({
            source: "live",
            naicsCode: primary,
            totalCount: json.totalRecords ?? 0,
            totalAmount: null,
            recentOpportunities: (json.opportunitiesData ?? []).slice(0, 3).map(
              (o: { title: string; fullParentPathName: string; postedDate: string; responseDeadLine: string }) => ({
                title: o.title,
                agency: o.fullParentPathName,
                postedDate: o.postedDate,
                responseDeadline: o.responseDeadLine,
              })
            ),
          });
        }
      } catch {
        // Fall through to demo data
      }
    }

    // Demo mode — realistic static data
    const stats = matchSector(primary);
    return NextResponse.json({
      source: "demo",
      naicsCode: primary,
      totalCount: stats.count,
      totalAmount: stats.amount,
      sector: stats.sector,
      naicsCodes,
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
