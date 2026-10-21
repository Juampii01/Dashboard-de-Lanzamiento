export interface AdminToggle {
  day_number: number;
  is_globally_unlocked: boolean;
  unlocked_at: string | null;
  scheduled_unlock_at: string | null;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  total_points: number;
  access_expires_at: string | null;
  last_seen_at: string | null;
  is_admin?: boolean;
  is_student?: boolean;
}

export interface Progress {
  user_id: string;
  day_number: number;
  is_completed: boolean;
  is_unlocked: boolean;
}

export interface Sorteo {
  user_id: string;
  eligible: boolean;
  submitted_at: string | null;
}

export type Segment = "paid" | "free" | "team";

export function segmentOf(u: AdminUser): Segment {
  if (u.is_admin) return "team";
  return u.is_student ? "free" : "paid";
}

export const SEGMENT_LABEL: Record<Segment, string> = {
  paid: "Pago",
  free: "Gratuito",
  team: "Equipo",
};

export const DAY_LABELS: Record<number, string> = {
  0: "Inicio — Dashboard",
  1: "Día 1 — Perfil Estratégico",
  2: "Día 2 — Mapa de Códigos",
  3: "Día 3 — Web + Portales",
  4: "Día 4 — Capability Statement",
  5: "Tu Próximo Paso",
};

/** "hace 3 h", "hace 2 d", fecha corta si es viejo. */
export function relativeTime(iso: string | null): string {
  if (!iso) return "Nunca";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return "Ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `hace ${d} d`;
  return new Date(iso).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
}
