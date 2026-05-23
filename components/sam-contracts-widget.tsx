"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createParticleBurst } from "@/lib/wow-effects";

interface SamData {
  source: "live" | "demo";
  naicsCode: string;
  totalCount: number;
  totalAmount: number | null;
  sector?: string;
  naicsCodes?: string[];
  recentOpportunities?: Array<{
    title: string;
    agency: string;
    postedDate: string;
    responseDeadline: string;
  }>;
}

function formatUSD(n: number) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

export function SamContractsWidget() {
  const [data, setData] = useState<SamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayAmount, setDisplayAmount] = useState<number | null>(null);
  const animating = useRef(false);
  const amountRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    fetch("/api/sam/contracts")
      .then((r) => r.json())
      .then((d: SamData) => { setData(d); setDisplayAmount(d.totalAmount); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleStatClick = useCallback(() => {
    if (animating.current || !data?.totalAmount) return;
    animating.current = true;

    // Green particle burst from the amount element
    if (amountRef.current) {
      const rect = amountRef.current.getBoundingClientRect();
      createParticleBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, "green", 18);
    }

    // Count-up from 0 to totalAmount
    const target = data.totalAmount;
    const duration = 1200;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayAmount(Math.round(target * eased));
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setDisplayAmount(target);
        animating.current = false;
      }
    };
    setDisplayAmount(0);
    requestAnimationFrame(step);
  }, [data]);

  if (loading) {
    return (
      <div className="rounded-xl border p-5 flex items-center gap-3" style={{ background: "rgba(20,58,107,0.4)", borderColor: "#1E3A5C", backdropFilter: "blur(12px)" }}>
        <div className="skeleton h-4 w-48" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div
      onClick={handleStatClick}
      className="rounded-xl border p-5 relative overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-0.5"
      style={{
        background: "linear-gradient(135deg, rgba(20,58,107,0.5) 0%, rgba(10,37,64,0.7) 100%)",
        borderColor: "rgba(0,214,122,0.25)",
        backdropFilter: "blur(12px)",
      }}
      title="Click para ver en vivo"
    >
      {/* Ambient green glow */}
      <div
        className="absolute top-0 right-0 w-48 h-48 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(0,214,122,0.06) 0%, transparent 70%)" }}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl select-none" style={{ filter: "drop-shadow(0 2px 8px rgba(0,214,122,0.4))" }}>💰</div>
          <div>
            <p
              className="text-xs uppercase tracking-widest font-medium mb-1"
              style={{ color: "#A8B5CC", fontFamily: "var(--font-sans)" }}
            >
              Contratos federales activos · NAICS {data.naicsCode}
              {data.source === "demo" && (
                <span className="ml-2 text-[9px] opacity-50">(demo)</span>
              )}
            </p>

            <div className="flex items-baseline gap-3 flex-wrap">
              {displayAmount != null && (
                <span
                  ref={amountRef}
                  className="font-bold leading-none tabular-nums"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "2rem",
                    color: "#00D67A",
                    textShadow: "0 0 24px rgba(0,214,122,0.3)",
                    transition: "text-shadow 0.3s",
                  }}
                >
                  {formatUSD(displayAmount)}
                </span>
              )}
              <span className="text-sm font-semibold" style={{ color: "#A8B5CC" }}>
                {data.totalCount.toLocaleString()} contratos
              </span>
            </div>

            {data.sector && (
              <p className="text-xs mt-1" style={{ color: "#5A6B85", fontFamily: "var(--font-sans)" }}>
                {data.sector}
              </p>
            )}
          </div>
        </div>

        <div
          className="shrink-0 text-right text-xs px-3 py-1.5 rounded-lg"
          style={{
            background: "rgba(0,214,122,0.1)",
            border: "1px solid rgba(0,214,122,0.2)",
            color: "#00D67A",
            fontFamily: "var(--font-mono)",
          }}
        >
          En vivo
          <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-[#00D67A] animate-pulse" style={{ verticalAlign: "middle" }} />
        </div>
      </div>

      {data.recentOpportunities && data.recentOpportunities.length > 0 && (
        <div className="mt-4 space-y-2">
          {data.recentOpportunities.slice(0, 2).map((opp, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-xs"
              style={{ color: "#A8B5CC", fontFamily: "var(--font-sans)" }}
            >
              <span style={{ color: "#D7263D" }}>›</span>
              <span className="truncate">{opp.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
