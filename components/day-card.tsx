"use client";

import { cn } from "@/lib/utils";
import { Lock, CheckCircle2, ChevronRight } from "lucide-react";
import Link from "next/link";

interface DayCardProps {
  day: number;
  title: string;
  description: string;
  isUnlocked: boolean;
  isCompleted: boolean;
  href: string;
}

export function DayCard({
  day,
  title,
  description,
  isUnlocked,
  isCompleted,
  href,
}: DayCardProps) {
  const card = (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden border transition-all duration-300",
        isCompleted
          ? "border-[#00D67A]/40 cursor-pointer hover:-translate-y-1"
          : isUnlocked
          ? "border-[#D7263D] card-active-pulse hover:-translate-y-1 cursor-pointer"
          : "border-[#1E3A5C] cursor-not-allowed"
      )}
      style={{
        background: isCompleted
          ? "rgba(0,30,20,0.55)"
          : isUnlocked
          ? "rgba(20,58,107,0.65)"
          : "rgba(10,37,64,0.5)",
        backdropFilter: isUnlocked || isCompleted ? "blur(18px)" : "none",
        boxShadow: isCompleted
          ? "0 0 0 1px rgba(0,214,122,0.35), 0 8px 32px rgba(0,0,0,0.4)"
          : isUnlocked
          ? undefined
          : "none",
      }}
    >
      {/* Completed green overlay */}
      {isCompleted && (
        <div className="absolute inset-0 bg-[#00D67A]/5 pointer-events-none" />
      )}

      {/* Main content */}
      <div className={cn("p-6 pb-4", !isUnlocked && "[filter:grayscale(0.5)]")}>
        {/* Row: label + state badge */}
        <div className="flex items-center justify-between mb-5">
          <span
            className="text-[10px] uppercase tracking-[0.18em] text-[#A8B5CC] font-medium"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            Reto {day}
          </span>

          {isCompleted ? (
            <span
              className="px-2.5 py-0.5 rounded-full bg-[#00D67A]/20 text-[#00D67A] text-[9px] font-bold uppercase tracking-wider flex items-center gap-1"
              style={{ fontFamily: "var(--font-arcade)" }}
            >
              <CheckCircle2 className="w-3 h-3" /> Listo
            </span>
          ) : isUnlocked ? (
            <span
              className="px-2.5 py-0.5 rounded-full bg-[#D7263D] text-white text-[9px] font-bold uppercase tracking-wider animate-pulse"
              style={{ fontFamily: "var(--font-arcade)" }}
            >
              Activo
            </span>
          ) : (
            <Lock className="w-4 h-4 text-[#5A6B85]" />
          )}
        </div>

        {/* Big day number */}
        <div
          className="text-8xl font-bold leading-none mb-4 select-none tabular-nums"
          style={{
            fontFamily: "var(--font-display)",
            color: isCompleted ? "#00D67A" : isUnlocked ? "#FFFFFF" : "#3D4E6B",
            textShadow: isUnlocked && !isCompleted
              ? "0 0 40px rgba(255,214,10,0.12)"
              : isCompleted
              ? "0 0 30px rgba(0,214,122,0.2)"
              : undefined,
          }}
        >
          {String(day).padStart(2, "0")}
        </div>

        {/* Title */}
        <h3
          className="font-bold text-lg leading-snug mb-2"
          style={{
            fontFamily: "var(--font-display)",
            color: isUnlocked ? "#FFFFFF" : "#5A6B85",
          }}
        >
          {title}
        </h3>

        {/* Description */}
        <p
          className="text-sm leading-relaxed"
          style={{ color: isUnlocked ? "#A8B5CC" : "#5A6B85" }}
        >
          {description}
        </p>
      </div>

      {/* CTA row */}
      <div className="px-6 pb-6">
        {isCompleted ? (
          <button className="w-full py-2.5 rounded-lg border border-white/20 text-white/80 text-sm font-semibold hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
            Ver entregables
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : isUnlocked ? (
          <div
            className="w-full py-3 rounded-lg text-center text-white font-bold text-sm transition-all hover:brightness-90"
            style={{
              background: "#D7263D",
              fontFamily: "var(--font-sans)",
              boxShadow: "0 4px 16px rgba(215,38,61,0.4)",
            }}
          >
            Empezar reto →
          </div>
        ) : (
          <p className="text-center text-[11px] text-[#5A6B85] py-1 flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3" />
            Se desbloquea en vivo
          </p>
        )}
      </div>

      {/* Locked blur */}
      {!isUnlocked && (
        <div className="absolute inset-0 backdrop-blur-[1.5px]" />
      )}
    </div>
  );

  if (!isUnlocked) return card;
  return <Link href={href}>{card}</Link>;
}
