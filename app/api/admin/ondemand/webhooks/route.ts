import { NextRequest, NextResponse } from "next/server";
import { isMigrationMissing, requireAdmin } from "@/lib/ondemand-server";

/**
 * GET /api/admin/ondemand/webhooks  (solo admins)
 * Últimos webhooks (100 por defecto, ?limit= hasta 1000) recibidos de GoHighLevel, con lo que se hizo con cada
 * uno. Sirve para ver el payload real y revisar compras que no se pudieron leer.
 */
export async function GET(req: NextRequest) {
  // ?limit=N (máx. 1000) para revisar más historial; por defecto, los últimos 100.
  const limit = Math.min(1000, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 100));
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const full = await auth.db
    .from("webhook_logs")
    .select("id, source, product, email, processed, error, purchase_id, body, raw_body, received_at, processed_at")
    .order("received_at", { ascending: false })
    .limit(limit);
  if (!full.error) return NextResponse.json({ logs: full.data ?? [] });

  // Sin la migración 20261104000001 (columnas email / purchase_id / processed_at).
  if (isMigrationMissing(full.error)) {
    const basic = await auth.db
      .from("webhook_logs")
      .select("id, source, product, processed, error, body, raw_body, received_at")
      .order("received_at", { ascending: false })
      .limit(limit);
    if (basic.error) {
      return NextResponse.json({ error: isMigrationMissing(basic.error) ? "migration_missing" : "internal" }, { status: isMigrationMissing(basic.error) ? 501 : 500 });
    }
    return NextResponse.json({ logs: basic.data ?? [] });
  }
  return NextResponse.json({ error: "internal" }, { status: 500 });
}
