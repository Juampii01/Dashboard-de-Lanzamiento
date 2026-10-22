"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Search,
  UserPlus,
  Download,
  Trophy,
  X,
  Link2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Check,
  Lock,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, isExpired } from "@/lib/utils";
import { breakdownRows, type Breakdown } from "@/lib/points-breakdown";
import { PageHeader, StatusPill, inputClass } from "../_components/ui";
import {
  relativeTime,
  segmentOf,
  SEGMENT_LABEL,
  DAY_LABELS,
  type AdminUser,
  type Progress,
  type Segment,
  type Sorteo,
} from "../_lib/types";

type SegFilter = Segment | "all";
type ProgFilter = "any" | "never" | "stuck" | "1" | "2" | "3" | "4";
type SortKey = "points" | "name" | "recent";

const PAGE_SIZE = 25;

const PROG_OPTIONS: { value: ProgFilter; label: string }[] = [
  { value: "any", label: "Cualquier progreso" },
  { value: "never", label: "Nunca ingresaron" },
  { value: "stuck", label: "Ingresaron sin terminar Día 1" },
  { value: "1", label: "Último completado: Día 1" },
  { value: "2", label: "Último completado: Día 2" },
  { value: "3", label: "Último completado: Día 3" },
  { value: "4", label: "Terminaron el Día 4" },
];

interface Props {
  users: AdminUser[];
  allProgress: Progress[];
  sorteos: Sorteo[];
}

export function UsersClient({ users, allProgress, sorteos }: Props) {
  const [q, setQ] = useState("");
  const [seg, setSeg] = useState<SegFilter>("paid");
  const [prog, setProg] = useState<ProgFilter>("any");
  const [sort, setSort] = useState<SortKey>("points");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Copia local del progreso para reflejar overrides sin recargar.
  const [progress, setProgress] = useState(allProgress);

  const progressByUser = useMemo(() => {
    const m: Record<string, Record<number, Progress>> = {};
    for (const p of progress) (m[p.user_id] ??= {})[p.day_number] = p;
    return m;
  }, [progress]);

  const sorteoMap = useMemo(() => Object.fromEntries(sorteos.map((s) => [s.user_id, s])), [sorteos]);

  const lastCompleted = (id: string) => {
    const p = progressByUser[id] ?? {};
    let last = 0;
    for (const d of [1, 2, 3, 4]) if (p[d]?.is_completed) last = d;
    return last;
  };

  const counts = useMemo(() => {
    const c = { all: users.length, paid: 0, free: 0, team: 0, pending: 0 } as Record<SegFilter, number>;
    for (const u of users) c[segmentOf(u)]++;
    return c;
  }, [users]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = users.filter((u) => {
      if (seg !== "all" && segmentOf(u) !== seg) return false;
      if (needle && !(`${u.full_name ?? ""} ${u.email}`.toLowerCase().includes(needle))) return false;
      if (prog === "never") return !u.last_seen_at;
      if (prog === "stuck") return !!u.last_seen_at && lastCompleted(u.id) === 0;
      if (prog !== "any") return lastCompleted(u.id) === Number(prog);
      return true;
    });
    list.sort((a, b) => {
      if (sort === "name") return (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email, "es");
      if (sort === "recent") return (b.last_seen_at ?? "").localeCompare(a.last_seen_at ?? "");
      return b.total_points - a.total_points;
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, q, seg, prog, sort, progressByUser]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const rows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const selected = users.find((u) => u.id === selectedId) ?? null;

  function resetPage<T>(set: (v: T) => void) {
    return (v: T) => { set(v); setPage(0); };
  }

  function exportCsv() {
    const header = ["nombre", "email", "tipo", "puntos", "ultimo_dia_completado", "ultimo_ingreso"];
    const lines = filtered.map((u) =>
      [u.full_name ?? "", u.email, SEGMENT_LABEL[segmentOf(u)], u.total_points, lastCompleted(u.id), u.last_seen_at ?? ""]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `usuarios-${seg}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <PageHeader
        eyebrow="General"
        title="Usuarios"
        description="Busca a cualquier participante, filtra por avance y abre su ficha para gestionar acceso, días y puntos."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} className="gap-2">
              <Download className="w-4 h-4" /> Exportar CSV
            </Button>
            <Button asChild>
              <Link href="/admin/usuarios/nuevo" className="gap-2">
                <UserPlus className="w-4 h-4" /> Crear usuario
              </Link>
            </Button>
          </>
        }
      />

      {/* Segmentos */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {(["paid", "free", "pending", "team", "all"] as SegFilter[]).filter((s) => s !== "pending" || counts.pending > 0).map((s) => (
          <button
            key={s}
            onClick={() => resetPage(setSeg)(s)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
              seg === s ? "border-secondary bg-secondary text-white" : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {s === "all" ? "Todos" : s === "paid" ? "Pagos" : s === "free" ? "Gratuitos" : s === "pending" ? "Sin verificar" : "Equipo"}
            <span className={cn("text-[11px] tabular-nums", seg === s ? "text-white/70" : "text-muted-foreground/70")}>{counts[s]}</span>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => resetPage(setQ)(e.target.value)}
            placeholder="Buscar por nombre o email…"
            className={cn(inputClass, "pl-9 h-10")}
          />
        </div>
        <select value={prog} onChange={(e) => resetPage(setProg)(e.target.value as ProgFilter)} className={cn(inputClass, "h-10 sm:w-64")}>
          {PROG_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={cn(inputClass, "h-10 sm:w-44")}>
          <option value="points">Más puntos</option>
          <option value="recent">Ingreso más reciente</option>
          <option value="name">Nombre (A–Z)</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Participante</th>
                <th className="px-4 py-3">Progreso</th>
                <th className="px-4 py-3 text-right">Puntos</th>
                <th className="px-4 py-3 hidden md:table-cell">Último ingreso</th>
                <th className="px-4 py-3 text-center hidden sm:table-cell">Sorteo</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    Nadie coincide con esos filtros.
                  </td>
                </tr>
              )}
              {rows.map((u) => {
                const p = progressByUser[u.id] ?? {};
                const done = [1, 2, 3, 4].filter((d) => p[d]?.is_completed).length;
                return (
                  <tr
                    key={u.id}
                    onClick={() => setSelectedId(u.id)}
                    className={cn("cursor-pointer transition-colors hover:bg-muted/40", selectedId === u.id && "bg-secondary/[0.06]")}
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{u.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                      {seg === "all" && <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">{SEGMENT_LABEL[segmentOf(u)]}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map((d) => (
                            <span
                              key={d}
                              title={`Día ${d}: ${p[d]?.is_completed ? "completado" : "pendiente"}`}
                              className={cn(
                                "grid place-items-center w-6 h-6 rounded-md text-[10px] font-bold",
                                p[d]?.is_completed ? "bg-[var(--success)] text-white" : "bg-muted text-muted-foreground/70"
                              )}
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">{done}/4</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums">{u.total_points.toLocaleString("es")}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{relativeTime(u.last_seen_at)}</td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      {sorteoMap[u.id]?.eligible ? <Trophy className="w-4 h-4 text-[#C9A400] mx-auto" aria-label="Elegible" /> : <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight className="w-4 h-4 text-muted-foreground inline" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <p>
            {filtered.length === 0
              ? "0 resultados"
              : `${safePage * PAGE_SIZE + 1}–${Math.min(filtered.length, (safePage + 1) * PAGE_SIZE)} de ${filtered.length}`}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" disabled={safePage === 0} onClick={() => setPage(safePage - 1)} aria-label="Página anterior">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="tabular-nums px-1">{safePage + 1} / {pages}</span>
            <Button variant="ghost" size="icon" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)} aria-label="Página siguiente">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {selected && (
        <UserDrawer
          key={selected.id}
          user={selected}
          progress={progressByUser[selected.id] ?? {}}
          eligible={!!sorteoMap[selected.id]?.eligible}
          onClose={() => setSelectedId(null)}
          onOverride={(day, unlock) =>
            setProgress((prev) => {
              const exists = prev.some((p) => p.user_id === selected.id && p.day_number === day);
              return exists
                ? prev.map((p) => (p.user_id === selected.id && p.day_number === day ? { ...p, is_unlocked: unlock } : p))
                : [...prev, { user_id: selected.id, day_number: day, is_unlocked: unlock, is_completed: false }];
            })
          }
          onReset={() => setProgress((prev) => prev.filter((p) => p.user_id !== selected.id))}
        />
      )}
    </>
  );
}

// ─── Ficha del usuario ──────────────────────────────────────────────────────

function UserDrawer({
  user,
  progress,
  eligible,
  onClose,
  onOverride,
  onReset,
}: {
  user: AdminUser;
  progress: Record<number, Progress>;
  eligible: boolean;
  onClose: () => void;
  onOverride: (day: number, unlock: boolean) => void;
  onReset: () => void;
}) {
  const [bd, setBd] = useState<Breakdown | null>(null);
  const [bdLoading, setBdLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [overriding, setOverriding] = useState<number | null>(null);
  const [resetPhase, setResetPhase] = useState<"idle" | "confirm" | "loading">("idle");

  async function loadBreakdown() {
    setBdLoading(true);
    try {
      const res = await fetch(`/api/admin/user-breakdown?userId=${user.id}`);
      const d = await res.json();
      if (res.ok) setBd({ total: d.total ?? 0, tracked: d.tracked ?? 0, by_category: d.by_category ?? {} });
    } catch { /* noop */ }
    setBdLoading(false);
  }

  async function generateLink() {
    setLinkLoading(true);
    try {
      const res = await fetch("/api/admin/users/access-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const d = await res.json();
      if (res.ok && d.link) {
        setLink(d.link);
        try { await navigator.clipboard.writeText(d.link); toast.success("Link copiado al portapapeles"); } catch { /* sin portapapeles */ }
      } else {
        toast.error(d.error === "no_email" ? "Ese usuario no tiene email." : "No se pudo generar el link.");
      }
    } catch {
      toast.error("Error al generar el link.");
    }
    setLinkLoading(false);
  }

  async function override(day: number, unlock: boolean) {
    setOverriding(day);
    try {
      const res = await fetch("/api/admin/day-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, day_number: day, unlock }),
      });
      if (!res.ok) throw new Error();
      onOverride(day, unlock);
      toast.success(`Día ${day} ${unlock ? "desbloqueado" : "bloqueado"} para ${user.full_name || user.email}.`);
    } catch {
      toast.error("Error al aplicar override.");
    }
    setOverriding(null);
  }

  async function reset() {
    setResetPhase("loading");
    try {
      const res = await fetch("/api/admin/reset-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: user.id }),
      });
      if (!res.ok) throw new Error();
      onReset();
      toast.success("Progreso reseteado.");
    } catch {
      toast.error("No se pudo resetear.");
    }
    setResetPhase("idle");
  }

  const expired = isExpired(user.access_expires_at);
  const seg = segmentOf(user);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-[#060d1a]/40" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 w-full max-w-[440px] bg-card border-l border-border shadow-2xl flex flex-col">
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-5 border-b border-border">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <StatusPill tone={seg === "paid" ? "gold" : "muted"}>{SEGMENT_LABEL[seg]}</StatusPill>
              <StatusPill tone={expired ? "muted" : "success"}>{expired ? "Acceso expirado" : "Acceso activo"}</StatusPill>
              {eligible && <StatusPill tone="gold"><Trophy className="w-3 h-3" /> Sorteo</StatusPill>}
            </div>
            <p className="text-lg font-extrabold text-foreground leading-tight">{user.full_name || "—"}</p>
            <p className="text-sm text-muted-foreground break-all">{user.email}</p>
            <p className="text-xs text-muted-foreground mt-1">Último ingreso: {relativeTime(user.last_seen_at)}</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="grid place-items-center w-8 h-8 rounded-lg text-muted-foreground hover:bg-muted shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">
          {/* Puntos */}
          <section>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Puntos</h3>
              {!bd && (
                <button onClick={loadBreakdown} disabled={bdLoading} className="text-xs font-semibold text-secondary dark:text-white hover:underline">
                  {bdLoading ? "Cargando…" : "Ver desglose"}
                </button>
              )}
            </div>
            <p className="text-[44px] leading-none text-foreground" style={{ fontFamily: "var(--font-arcade)" }}>
              {(bd?.total ?? user.total_points).toLocaleString("es")}
            </p>
            {bd && (
              <div className="mt-3 space-y-1.5">
                {breakdownRows(bd).length === 0 && <p className="text-sm text-muted-foreground">Sin puntos rastreados.</p>}
                {breakdownRows(bd).map(([label, pts]) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span>{label}</span>
                    <span className={cn("font-mono font-bold tabular-nums", pts < 0 ? "text-primary" : "text-[var(--success)]")}>
                      {pts > 0 ? `+${pts.toLocaleString("es")}` : pts.toLocaleString("es")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Días */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Días del challenge</h3>
            <div className="divide-y divide-border rounded-xl border border-border">
              {[1, 2, 3, 4].map((d) => {
                const p = progress[d];
                return (
                  <div key={d} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={cn(
                          "grid place-items-center w-6 h-6 rounded-md shrink-0",
                          p?.is_completed ? "bg-[var(--success)] text-white" : "bg-muted text-muted-foreground"
                        )}
                      >
                        {p?.is_completed ? <Check className="w-3.5 h-3.5" /> : <span className="text-[10px] font-bold">{d}</span>}
                      </span>
                      <p className="text-sm truncate">{DAY_LABELS[d]}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={overriding === d}
                      onClick={() => override(d, !p?.is_unlocked)}
                      title={p?.is_unlocked ? "Bloquear este día solo para este usuario" : "Desbloquear este día solo para este usuario"}
                      className="gap-1.5 text-xs shrink-0"
                    >
                      {p?.is_unlocked ? <><Lock className="w-3.5 h-3.5" /> Bloquear</> : <><Unlock className="w-3.5 h-3.5" /> Desbloquear</>}
                    </Button>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">Override individual: no afecta al resto de los participantes.</p>
          </section>

          {/* Acceso */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Link de acceso directo</h3>
            {link ? (
              <div className="space-y-2">
                <textarea
                  readOnly
                  value={link}
                  onFocus={(e) => e.currentTarget.select()}
                  className={cn(inputClass, "font-mono text-xs resize-none")}
                  style={{ minHeight: 72 }}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    onClick={async () => { try { await navigator.clipboard.writeText(link); toast.success("Link copiado"); } catch { toast.error("No se pudo copiar"); } }}
                  >
                    Copiar
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent("Tu acceso al GovBidder Challenge (toca para entrar, sin contraseña): " + link)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Enviar por WhatsApp
                    </a>
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">Un solo uso y con vencimiento. Si caduca, genera otro.</p>
              </div>
            ) : (
              <Button variant="outline" onClick={generateLink} disabled={linkLoading} className="gap-2 w-full">
                <Link2 className="w-4 h-4" /> {linkLoading ? "Generando…" : "Generar link sin contraseña"}
              </Button>
            )}
          </section>

          {/* Zona de riesgo */}
          <section className="rounded-xl border border-primary/30 p-4">
            <h3 className="text-sm font-bold text-primary">Resetear progreso</h3>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">
              Borra todo su avance (días, entregables, videos, quizzes y perfil) y lo deja como recién llegado. No se puede deshacer.
            </p>
            {resetPhase === "confirm" ? (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setResetPhase("idle")}>Cancelar</Button>
                <Button size="sm" onClick={reset}>Sí, resetear</Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" disabled={resetPhase === "loading"} onClick={() => setResetPhase("confirm")} className="gap-1.5 text-primary border-primary/40">
                <RotateCcw className="w-3.5 h-3.5" /> {resetPhase === "loading" ? "Reseteando…" : "Resetear progreso"}
              </Button>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
