"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, MessageSquare, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Panel, Stat, StatusPill, inputClass } from "../_components/ui";

interface AdminComment {
  id: string;
  display_name: string;
  content: string;
  created_at: string;
  hidden?: boolean;
  archived_at: string | null;
  featured: boolean;
}

type Filter = "actuales" | "archivados" | "destacados";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("es", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function ComentariosClient() {
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [filter, setFilter] = useState<Filter>("actuales");
  const [query, setQuery] = useState("");
  const [archiving, setArchiving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchComments = useCallback(async (): Promise<{ missing: boolean; comments: AdminComment[] }> => {
    const res = await fetch("/api/admin/comments");
    if (res.status === 501) return { missing: true, comments: [] };
    const data = await res.json();
    return { missing: false, comments: data.comments ?? [] };
  }, []);

  const apply = useCallback((r: { missing: boolean; comments: AdminComment[] }) => {
    setMissing(r.missing);
    setComments(r.comments);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchComments()
      .then(apply)
      .catch(() => { toast.error("No se pudieron cargar los comentarios."); setLoading(false); });
  }, [fetchComments, apply]);

  async function load() {
    try { apply(await fetchComments()); } catch { toast.error("No se pudieron cargar los comentarios."); }
  }

  const counts = useMemo(() => ({
    actuales: comments.filter((c) => !c.archived_at).length,
    archivados: comments.filter((c) => c.archived_at).length,
    destacados: comments.filter((c) => c.featured).length,
  }), [comments]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return comments
      .filter((c) => filter === "actuales" ? !c.archived_at : filter === "archivados" ? !!c.archived_at : c.featured)
      .filter((c) => !q || c.content.toLowerCase().includes(q) || c.display_name.toLowerCase().includes(q));
  }, [comments, filter, query]);

  async function toggleFeatured(c: AdminComment) {
    setBusyId(c.id);
    const next = !c.featured;
    setComments((prev) => prev.map((x) => (x.id === c.id ? { ...x, featured: next } : x)));
    const res = await fetch("/api/admin/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "feature", id: c.id, featured: next }),
    });
    setBusyId(null);
    if (!res.ok) {
      setComments((prev) => prev.map((x) => (x.id === c.id ? { ...x, featured: c.featured } : x)));
      toast.error("No se pudo guardar. Intenta de nuevo.");
    }
  }

  async function archiveCurrent() {
    if (!confirm(`¿Archivar los ${counts.actuales} comentarios actuales? No se borran: desaparecen del dashboard salvo los que tengan estrella, que se muestran como “lanzamiento anterior”.`)) return;
    setArchiving(true);
    try {
      const res = await fetch("/api/admin/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive_current" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${data.archived} comentarios archivados.`);
      await load();
      setFilter("archivados");
    } catch {
      toast.error("No se pudo archivar. Intenta de nuevo.");
    } finally {
      setArchiving(false);
    }
  }

  if (missing) {
    return (
      <Panel icon={MessageSquare} title="Falta correr la migración" tone="danger"
        description="Ejecuta supabase/migrations/20261029000001_comments_archive_featured.sql en Supabase para activar esta sección." />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Actuales" value={counts.actuales} />
        <Stat label="Archivados" value={counts.archivados} />
        <Stat label="Destacados" value={counts.destacados} tone="success" hint="Se muestran en el dashboard" />
      </div>

      <Panel
        icon={Archive}
        title="Preparar el lanzamiento nuevo"
        description="Primero marca con estrella los mejores comentarios actuales. Después archívalos: el dashboard queda limpio para los participantes nuevos y los destacados siguen visibles."
        action={
          <button
            onClick={archiveCurrent}
            disabled={archiving || counts.actuales === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {archiving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
            Archivar actuales
          </button>
        }
      />

      <Panel icon={MessageSquare} title="Comentarios">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="flex gap-2">
            {(["actuales", "archivados", "destacados"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize border ${filter === f ? "bg-secondary text-white border-secondary" : "border-border text-muted-foreground"}`}
              >
                {f} ({counts[f]})
              </button>
            ))}
          </div>
          <input className={`${inputClass} sm:max-w-xs`} placeholder="Buscar por texto o nombre" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Cargando…</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No hay comentarios en esta vista.</p>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((c) => (
              <li key={c.id} className="flex gap-3 py-3">
                <button
                  onClick={() => toggleFeatured(c)}
                  disabled={busyId === c.id}
                  title={c.featured ? "Quitar de destacados" : "Destacar"}
                  className="shrink-0 mt-0.5"
                >
                  <Star className="w-5 h-5" style={{ color: c.featured ? "var(--accent)" : "var(--muted-foreground)", fill: c.featured ? "var(--accent)" : "none" }} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{c.display_name}</span>
                    <span>{fmt(c.created_at)}</span>
                    {c.archived_at && <StatusPill tone="muted">Archivado</StatusPill>}
                    {c.hidden && <StatusPill tone="danger">Oculto (datos de contacto)</StatusPill>}
                  </div>
                  <p className="text-sm text-foreground mt-1 whitespace-pre-wrap break-words">{c.content}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
