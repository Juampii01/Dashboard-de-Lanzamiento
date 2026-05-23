"use client";

import { progressPercent } from "@/lib/utils";

interface ProgressBarProps {
  completedDays: number;
}

const MILESTONES = [
  { day: 1, label: "Día 1", pct: 25 },
  { day: 2, label: "Día 2", pct: 50 },
  { day: 3, label: "Día 3", pct: 75 },
  { day: 4, label: "Día 4", pct: 100 },
];

export function ProgressBar({ completedDays }: ProgressBarProps) {
  const pct = progressPercent(completedDays);

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-primary-foreground">
          Tu progreso
        </span>
        <span className="font-bold text-accent">{pct}%</span>
      </div>

      {/* Barra con avatar de Santo */}
      <div className="relative h-8">
        {/* Track */}
        <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Avatar de Santo — emoji que avanza */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-2xl transition-all duration-700 ease-out select-none"
          style={{ left: `clamp(16px, ${pct}%, calc(100% - 16px))` }}
          title="Santo"
        >
          🧑‍💼
        </div>
      </div>

      {/* Milestones */}
      <div className="flex justify-between text-xs text-white/60 px-1">
        {MILESTONES.map((m) => (
          <span
            key={m.day}
            className={pct >= m.pct ? "text-accent font-semibold" : ""}
          >
            {m.label}
          </span>
        ))}
      </div>
    </div>
  );
}
