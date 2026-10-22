import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   Primitivas visuales del panel admin.
   Todo sale de los tokens de globals.css (navy / rojo / dorado de la marca) para
   que funcione igual en modo claro y oscuro. Nada de hex sueltos aquí.
   ───────────────────────────────────────────────────────────────────────────── */

export const inputClass =
  "w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground " +
  "placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-secondary/40 " +
  "focus:border-secondary disabled:opacity-50 transition-colors";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between pb-6 mb-8 border-b border-border">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary mb-1.5">{eyebrow}</p>
        )}
        <h1 className="text-[28px] leading-tight font-extrabold tracking-tight text-foreground">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}

type Tone = "default" | "danger" | "gold" | "success";

const TONE_RING: Record<Tone, string> = {
  default: "border-border",
  danger: "border-primary/35",
  gold: "border-[color-mix(in_srgb,var(--accent)_55%,transparent)]",
  success: "border-[color-mix(in_srgb,var(--success)_45%,transparent)]",
};

const TONE_CHIP: Record<Tone, string> = {
  default: "bg-secondary/10 text-secondary dark:bg-white/10 dark:text-white",
  danger: "bg-primary/10 text-primary",
  gold: "bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] text-[#8a6d00] dark:text-accent",
  success: "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)]",
};

export function Panel({
  icon: Icon,
  title,
  description,
  tone = "default",
  action,
  children,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  tone?: Tone;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border bg-card shadow-[0_1px_2px_rgba(13,26,61,0.04)]", TONE_RING[tone], className)}>
      <div className="flex items-start gap-3 px-5 pt-5">
        {Icon && (
          <span className={cn("grid place-items-center w-9 h-9 rounded-xl shrink-0", TONE_CHIP[tone])}>
            <Icon className="w-[18px] h-[18px]" strokeWidth={2.2} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold text-foreground leading-snug">{title}</h2>
          {description && <p className="text-[13px] text-muted-foreground mt-0.5 leading-relaxed">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children && <div className="px-5 pb-5 pt-4">{children}</div>}
      {!children && <div className="pb-5" />}
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "default",
  live,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: Tone;
  live?: boolean;
}) {
  const color =
    tone === "success" ? "text-[var(--success)]" : tone === "danger" ? "text-primary" : "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card px-5 py-4">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {live && <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />}
        {label}
      </p>
      <p className={cn("mt-1 text-[40px] leading-none tracking-wide", color)} style={{ fontFamily: "var(--font-arcade)" }}>
        {value}
      </p>
      {hint && <p className="text-xs text-muted-foreground mt-1.5">{hint}</p>}
    </div>
  );
}

export function StatusPill({ tone, children }: { tone: Tone | "muted"; children: React.ReactNode }) {
  const cls =
    tone === "success"
      ? "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)]"
      : tone === "danger"
        ? "bg-primary/10 text-primary"
        : tone === "gold"
          ? "bg-[color-mix(in_srgb,var(--accent)_25%,transparent)] text-[#7a5f00] dark:text-accent"
          : "bg-muted text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap", cls)}>
      {children}
    </span>
  );
}

export function LinkTile({
  href,
  icon: Icon,
  title,
  description,
  meta,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  meta?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-2xl border border-border bg-card p-4 transition-all hover:border-secondary/40 hover:shadow-[0_6px_20px_-8px_rgba(13,26,61,0.25)]"
    >
      <span className="grid place-items-center w-9 h-9 rounded-xl shrink-0 bg-secondary/10 text-secondary dark:bg-white/10 dark:text-white">
        <Icon className="w-[18px] h-[18px]" strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 text-sm font-bold text-foreground">
          {title}
          <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        {meta && <div className="mt-2">{meta}</div>}
      </div>
    </Link>
  );
}

/** Fila on/off con switch, para estados globales (pausa, cierre, día abierto). */
export function ToggleRow({
  title,
  description,
  on,
  onTone = "danger",
  pill,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  on: boolean;
  onTone?: "danger" | "success";
  pill: React.ReactNode;
  children: React.ReactNode;
}) {
  const ring = on
    ? onTone === "danger"
      ? "border-primary/40 bg-primary/[0.04]"
      : "border-[color-mix(in_srgb,var(--success)_40%,transparent)] bg-[color-mix(in_srgb,var(--success)_5%,transparent)]"
    : "border-border bg-background/40";
  return (
    <div className={cn("flex items-center justify-between gap-4 rounded-xl border p-4 transition-colors", ring)}>
      <div className="min-w-0">
        <p className="font-semibold text-sm text-foreground">{title}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {pill}
        {children}
      </div>
    </div>
  );
}
