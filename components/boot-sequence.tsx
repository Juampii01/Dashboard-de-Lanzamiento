"use client";

import { useEffect, useState } from "react";

const LINES = [
  { text: "> Inicializando sistema Govbidder...", color: "#A8B5CC" },
  { text: "> Verificando credenciales federales...", color: "#A8B5CC" },
  { text: "> Conectando con SAM.gov...", color: "#A8B5CC" },
  { text: "> Cargando oportunidades de contratos...", color: "#A8B5CC" },
  { text: "> [OK] Perfil de contratista: VERIFICADO", color: "#00D67A" },
  { text: "> ACCESO CONCEDIDO. Bienvenido al Code Challenge.", color: "#FFD60A" },
];

const DELAYS = [0, 420, 820, 1200, 1680, 2200];

export function BootSequence() {
  const [show, setShow] = useState(false);
  const [visible, setVisible] = useState<number[]>([]);
  const [fading, setFading] = useState(false);
  const [gone, setGone] = useState(false);

  const dismiss = () => {
    setFading(true);
    setTimeout(() => { localStorage.setItem("gov_boot_v1", "1"); setGone(true); }, 650);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("gov_boot_v1")) return;
    setShow(true);

    LINES.forEach((_, i) => {
      setTimeout(() => {
        setVisible((prev) => [...prev, i]);
        if (i === LINES.length - 1) {
          setTimeout(dismiss, 700);
        }
      }, DELAYS[i] + 350);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!show || gone) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-700"
      style={{ background: "#000", opacity: fading ? 0 : 1, pointerEvents: fading ? "none" : "auto" }}
      onClick={dismiss}
    >
      <div className="w-full max-w-lg px-8">
        {/* Logo row */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-8 h-8 rounded flex items-center justify-center font-bold text-white text-sm"
            style={{ background: "#D7263D", fontFamily: "var(--font-display)" }}
          >
            G
          </div>
          <span style={{ fontFamily: "var(--font-mono)", color: "#00D67A", fontSize: "11px", letterSpacing: "0.22em" }}>
            GOVBIDDER TERMINAL v1.0
          </span>
        </div>

        {/* Lines */}
        <div className="space-y-3">
          {LINES.map((line, i) => (
            <div
              key={i}
              className="transition-all duration-300"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
                lineHeight: 1.6,
                color: line.color,
                opacity: visible.includes(i) ? 1 : 0,
                transform: visible.includes(i) ? "translateY(0)" : "translateY(6px)",
              }}
            >
              {line.text}
            </div>
          ))}
          {visible.length > 0 && visible.length < LINES.length && (
            <span
              className="inline-block w-[7px] h-[15px] bg-[#00D67A] animate-pulse"
              style={{ verticalAlign: "middle" }}
            />
          )}
        </div>

        <p
          className="mt-10 text-[10px]"
          style={{ color: "#3D4E6B", fontFamily: "var(--font-mono)" }}
        >
          Click para saltar
        </p>
      </div>
    </div>
  );
}
