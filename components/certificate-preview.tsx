interface CertificatePreviewProps {
  completedDays: number;
  userName: string;
}

export function CertificatePreview({ completedDays, userName }: CertificatePreviewProps) {
  const pct = Math.round((completedDays / 4) * 100);
  const isComplete = completedDays >= 4;

  return (
    <div
      className="rounded-xl border relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(20,58,107,0.6) 0%, rgba(10,37,64,0.8) 100%)",
        borderColor: isComplete ? "rgba(0,214,122,0.4)" : "rgba(255,214,10,0.25)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Top progress bar */}
      <div className="h-1 w-full" style={{ background: "#1E3A5C" }}>
        <div
          className="h-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: isComplete
              ? "#00D67A"
              : "linear-gradient(90deg, #D7263D, #FFD60A)",
            boxShadow: isComplete
              ? "0 0 8px rgba(0,214,122,0.6)"
              : "0 0 8px rgba(255,214,10,0.4)",
          }}
        />
      </div>

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start gap-3 mb-5">
          <div
            className="text-2xl select-none"
            style={{ filter: `drop-shadow(0 2px 8px rgba(255,214,10,${isComplete ? "0.6" : "0.3"}))` }}
          >
            📜
          </div>
          <div className="flex-1">
            <h3
              className="font-bold text-white text-base"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {isComplete ? "¡Certificado listo!" : "Tu certificado se está construyendo"}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "#A8B5CC" }}>
              {isComplete
                ? "Podés descargarlo desde el Día 4"
                : `Completá los 4 retos para desbloquearlo — ${pct}% listo`}
            </p>
          </div>
          <span
            className="font-bold tabular-nums text-sm"
            style={{ fontFamily: "var(--font-mono)", color: isComplete ? "#00D67A" : "#FFD60A" }}
          >
            {pct}%
          </span>
        </div>

        {/* Certificate mockup */}
        <div
          className="relative rounded-lg mx-auto overflow-hidden"
          style={{
            background: "rgba(10,26,48,0.9)",
            border: "1px solid #1E3A5C",
            padding: "20px",
            maxWidth: "340px",
          }}
        >
          {/* Certificate red top bar */}
          <div className="h-0.5 w-full mb-4 rounded-full" style={{ background: "#D7263D" }} />

          <div className="text-center space-y-3">
            <p
              style={{
                fontFamily: "var(--font-arcade)",
                fontSize: "7px",
                color: "#A8B5CC",
                letterSpacing: "0.18em",
              }}
            >
              CERTIFICADO DE FINALIZACIÓN
            </p>

            <p className="text-xs" style={{ color: "#5A6B85", fontFamily: "var(--font-sans)" }}>
              Este certificado se otorga a
            </p>

            {/* Name — revealed day 1 */}
            <p
              className="font-bold text-base transition-all duration-700"
              style={{
                fontFamily: "var(--font-display)",
                color: completedDays >= 1 ? "#FFFFFF" : "#1E3A5C",
                filter: completedDays >= 1 ? "none" : "blur(8px)",
              }}
            >
              {userName || "Tu nombre aquí"}
            </p>

            <p className="text-[10px]" style={{ color: "#5A6B85", fontFamily: "var(--font-sans)" }}>
              por completar exitosamente el
            </p>

            {/* Program name — revealed day 2 */}
            <p
              className="font-bold text-sm transition-all duration-700"
              style={{
                fontFamily: "var(--font-display)",
                color: completedDays >= 2 ? "#FFD60A" : "#1E3A5C",
                filter: completedDays >= 2 ? "none" : "blur(8px)",
              }}
            >
              Govbidder Challenge
            </p>

            {/* Day badges */}
            <div className="flex justify-center gap-3 py-1">
              {[1, 2, 3, 4].map((d) => (
                <div key={d} className="flex flex-col items-center gap-1">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-500"
                    style={{
                      background: completedDays >= d ? "#00D67A" : "#1E3A5C",
                      color: completedDays >= d ? "#0A2540" : "#3D4E6B",
                      boxShadow: completedDays >= d ? "0 0 10px rgba(0,214,122,0.45)" : "none",
                    }}
                  >
                    {completedDays >= d ? "✓" : d}
                  </div>
                  <span
                    className="text-[8px]"
                    style={{
                      fontFamily: "var(--font-sans)",
                      color: completedDays >= d ? "#00D67A" : "#3D4E6B",
                    }}
                  >
                    D{d}
                  </span>
                </div>
              ))}
            </div>

            {/* Signature — revealed day 4 */}
            <div
              className="flex justify-center gap-8 pt-2 transition-all duration-700"
              style={{ filter: completedDays >= 4 ? "none" : "blur(5px)", opacity: completedDays >= 3 ? 1 : 0.3 }}
            >
              <div className="text-center">
                <div className="h-px w-16 mx-auto mb-1" style={{ background: "#1E3A5C" }} />
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "8px",
                    color: "#5A6B85",
                  }}
                >
                  Govbidder Academy
                </p>
              </div>
            </div>
          </div>

          {/* Incomplete overlay — pixelated blur effect */}
          {!isComplete && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(180deg, transparent 40%, rgba(10,26,48,0.7) 100%)",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
