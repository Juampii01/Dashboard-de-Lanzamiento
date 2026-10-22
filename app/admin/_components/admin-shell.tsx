"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Radio,
  PlaySquare,
  Target,
  Mail,
  TrendingUp,
  Handshake,
  Trophy,
  ShoppingBag,
  BookOpen,
  ArrowLeft,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Rutas extra que también marcan este ítem como activo. */
  also?: string[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// Orden = orden en que se usan durante un challenge: antes/durante → después.
const NAV: NavGroup[] = [
  {
    label: "General",
    items: [
      { href: "/admin", label: "Inicio", icon: LayoutDashboard },
      { href: "/admin/usuarios", label: "Usuarios", icon: Users },
      { href: "/admin/compras", label: "Compras y accesos", icon: ShoppingBag },
    ],
  },
  {
    label: "Durante el challenge",
    items: [
      { href: "/admin/en-vivo", label: "En vivo", icon: Radio },
      { href: "/admin/contenido", label: "Contenido", icon: PlaySquare },
      { href: "/admin/misiones", label: "Misiones", icon: Target },
      { href: "/admin/comunicaciones", label: "Comunicaciones", icon: Mail },
    ],
  },
  {
    label: "Después del challenge",
    items: [
      { href: "/admin/ventas", label: "Ventas", icon: TrendingUp },
      { href: "/admin/referidos", label: "Referidos", icon: Handshake },
      { href: "/admin/cierre", label: "Cierre y sorteo", icon: Trophy, also: ["/admin/sorteo"] },
    ],
  },
];

function isActive(pathname: string, item: NavItem) {
  const match = (h: string) => (h === "/admin" ? pathname === "/admin" : pathname === h || pathname.startsWith(h + "/"));
  return match(item.href) || (item.also ?? []).some(match);
}

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <Link href="/admin" onClick={onNavigate} className="flex items-center gap-3 px-5 pt-6 pb-7">
        <Image src="/halcon.png" alt="" width={34} height={34} className="rounded-lg" />
        <div className="leading-tight">
          <p className="font-extrabold text-[15px] text-white tracking-tight">GovBidder</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">Panel admin</p>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 space-y-6">
        {NAV.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-semibold transition-colors",
                        active ? "bg-white/[0.09] text-white" : "text-white/65 hover:bg-white/[0.05] hover:text-white"
                      )}
                    >
                      {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary" />}
                      <Icon className={cn("w-[17px] h-[17px]", active ? "text-white" : "text-white/50")} strokeWidth={2.2} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-3 py-4 mt-4 border-t border-white/10 space-y-0.5">
        <Link
          href="/admin/guia"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors",
            pathname.startsWith("/admin/guia") ? "bg-white/[0.09] text-white" : "text-white/60 hover:bg-white/[0.05] hover:text-white"
          )}
        >
          <BookOpen className="w-4 h-4" /> Guía del panel
        </Link>
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-semibold text-white/60 hover:bg-white/[0.05] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al dashboard
        </Link>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/admin";
  const [open, setOpen] = useState(false);

  const current = NAV.flatMap((g) => g.items).find((i) => isActive(pathname, i));

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar fija (desktop) */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-[248px] bg-[#0d1a3d] z-30">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Top bar (mobile) */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-3 bg-[#0d1a3d] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Image src="/halcon.png" alt="" width={28} height={28} className="rounded-md" />
          <p className="text-sm font-bold text-white">{current?.label ?? "Panel admin"}</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="grid place-items-center w-9 h-9 rounded-lg text-white/80 hover:bg-white/10"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Drawer (mobile) */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-[#060d1a]/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[264px] bg-[#0d1a3d] shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
              className="absolute right-3 top-5 grid place-items-center w-8 h-8 rounded-lg text-white/70 hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
            <SidebarContent pathname={pathname} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <main className="lg:pl-[248px]">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-10 py-8 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
