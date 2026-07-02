"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface WebReport {
  id: string;
  message: string;
  status: string; // pending | resolved
  created_at: string;
  full_name: string | null;
  email: string;
  regen_granted_at?: string | null;
  regen_consumed_at?: string | null;
}

export function WebReportsAdminPanel() {
  const [reports, setReports] = useState<WebReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const [granting, setGranting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/web-reports")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setReports(d.reports ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function resolve(id: string) {
    setResolving(id);
    try {
      const res = await fetch("/api/admin/web-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: "resolved" } : r)));
      toast.success("Marcado como resuelto.");
    } catch {
      toast.error("Error al marcar como resuelto.");
    }
    setResolving(null);
  }

  async function grantRegen(id: string) {
    setGranting(id);
    try {
      const res = await fetch("/api/admin/web-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "grant_regen" }),
      });
      if (res.status === 501) {
        toast.error("Falta correr la migración 20260702000004_web_regen_gate.sql en Supabase.");
        return;
      }
      if (!res.ok) throw new Error();
      const now = new Date().toISOString();
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: "resolved", regen_granted_at: now, regen_consumed_at: null } : r)));
      toast.success("Regeneración habilitada — ya puede tocar \"Regenerar mi web\" una vez.");
    } catch {
      toast.error("Error al habilitar la regeneración.");
    }
    setGranting(null);
  }

  const pending = reports.filter((r) => r.status !== "resolved");
  const resolved = reports.filter((r) => r.status === "resolved");

  if (loading) {
    return <p className="text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin inline" /> Cargando...</p>;
  }

  if (reports.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay reportes todavía.</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Pendientes {pending.length > 0 && <span>· {pending.length}</span>}
        </p>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ninguno pendiente 🎉</p>
        ) : (
          <div className="space-y-2">
            {pending.map((r) => (
              <div
                key={r.id}
                className="flex items-start justify-between gap-3 p-3 border rounded-xl bg-card"
                style={{ borderColor: "#1E3A5C" }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{r.full_name || r.email || "—"}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                  <p className="text-sm mt-1" style={{ color: "var(--foreground)" }}>{r.message}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {new Date(r.created_at).toLocaleString("es-US", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    disabled={granting === r.id}
                    onClick={() => grantRegen(r.id)}
                    className="text-xs"
                  >
                    {granting === r.id ? "..." : "Habilitar regenerar"}
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    disabled={resolving === r.id}
                    onClick={() => resolve(r.id)}
                    className="text-xs"
                  >
                    {resolving === r.id ? "..." : "Marcar resuelto"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {resolved.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Resueltos · {resolved.length}
          </p>
          <div className="space-y-2">
            {resolved.map((r) => (
              <div
                key={r.id}
                className="flex items-start justify-between gap-3 p-3 border rounded-xl bg-card"
                style={{ borderColor: "#1E3A5C", opacity: 0.7 }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{r.full_name || r.email || "—"}</p>
                  <p className="text-sm mt-1">{r.message}</p>
                </div>
                {r.regen_granted_at && (
                  <span
                    className="text-[10px] font-bold uppercase tracking-wide shrink-0 px-2 py-1 rounded-full"
                    style={{
                      color: r.regen_consumed_at ? "var(--muted-foreground)" : "var(--success)",
                      background: r.regen_consumed_at ? "var(--muted)" : "color-mix(in srgb, var(--success) 15%, transparent)",
                    }}
                  >
                    {r.regen_consumed_at ? "Regen. usada" : "Regen. habilitada"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
