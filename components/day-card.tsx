"use client";

import { cn } from "@/lib/utils";
import { Lock, CheckCircle2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface DayCardProps {
  day: number;
  title: string;
  description: string;
  isUnlocked: boolean;
  isCompleted: boolean;
  href: string;
}

const DAY_COLORS: Record<number, string> = {
  1: "from-blue-600 to-blue-800",
  2: "from-purple-600 to-purple-800",
  3: "from-emerald-600 to-emerald-800",
  4: "from-amber-500 to-orange-600",
};

export function DayCard({
  day,
  title,
  description,
  isUnlocked,
  isCompleted,
  href,
}: DayCardProps) {
  const gradient = DAY_COLORS[day] ?? "from-slate-600 to-slate-800";

  const card = (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden border transition-all duration-300",
        isUnlocked
          ? "cursor-pointer hover:shadow-xl hover:-translate-y-1 border-border"
          : "cursor-not-allowed opacity-60 border-border/40",
        isCompleted && "ring-2 ring-green-500"
      )}
    >
      {/* Header con gradiente */}
      <div className={cn("bg-gradient-to-r p-5", gradient)}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/70 text-xs font-medium uppercase tracking-widest mb-1">
              Día {day}
            </p>
            <h3 className="text-white font-bold text-lg leading-tight">{title}</h3>
          </div>
          <div className="flex-shrink-0 ml-3">
            {isCompleted ? (
              <CheckCircle2 className="w-8 h-8 text-green-300" />
            ) : isUnlocked ? (
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                {day}
              </div>
            ) : (
              <Lock className="w-8 h-8 text-white/50" />
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="bg-card p-5">
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>

        <div className="mt-4 flex items-center justify-between">
          {isCompleted ? (
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
              Completado
            </Badge>
          ) : isUnlocked ? (
            <Badge className="bg-accent/20 text-accent-foreground hover:bg-accent/30">
              Disponible
            </Badge>
          ) : (
            <Badge variant="secondary">Bloqueado</Badge>
          )}

          {isUnlocked && (
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Overlay difuminado para días bloqueados */}
      {!isUnlocked && (
        <div className="absolute inset-0 backdrop-blur-[2px] bg-background/30 flex items-center justify-center">
          <div className="text-center">
            <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-muted-foreground">
              Se desbloquea en vivo
            </p>
          </div>
        </div>
      )}
    </div>
  );

  if (!isUnlocked) return card;

  return <Link href={href}>{card}</Link>;
}
