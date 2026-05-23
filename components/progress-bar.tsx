"use client";

import { progressPercent } from "@/lib/utils";

interface ProgressBarProps {
  completedDays: number;
}

export function ProgressBar({ completedDays }: ProgressBarProps) {
  const pct = progressPercent(completedDays);

  return (
    <div className="w-full space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span
          className="text-[11px] uppercase tracking-[0.15em] text-[#A8B5CC] font-medium"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          Tu progreso
        </span>
        <span
          className="text-white font-bold text-base tabular-nums"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {pct}%
        </span>
      </div>

      {/* Track + avatar */}
      <div className="relative h-7">
        {/* Track */}
        <div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{ background: "#0A2540", border: "1px solid #1E3A5C" }}
        >
          {/* Fill */}
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${pct}%`,
              background: "#00D67A",
              boxShadow:
                pct > 0
                  ? "inset 0 1px 0 rgba(255,255,255,0.25), 0 0 16px rgba(0,214,122,0.4)"
                  : undefined,
            }}
          />
        </div>

        {/* Santo avatar */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-xl transition-all duration-700 ease-out select-none"
          style={{
            left: `clamp(14px, ${pct}%, calc(100% - 14px))`,
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))",
          }}
          title="¡Vamos!"
          aria-hidden
        >
          🕺
        </div>
      </div>

      {/* Milestone labels */}
      <div className="flex justify-between px-0.5">
        {[1, 2, 3, 4].map((d) => (
          <span
            key={d}
            className="text-[10px] uppercase tracking-wider transition-colors"
            style={{
              fontFamily: "var(--font-sans)",
              color: completedDays >= d ? "#00D67A" : "#5A6B85",
              fontWeight: completedDays >= d ? 600 : 400,
            }}
          >
            Día {d}
          </span>
        ))}
      </div>
    </div>
  );
}
