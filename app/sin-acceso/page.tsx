/**
 * /sin-acceso — shown when an authenticated user has no verified Hotmart
 * purchase.  Lives OUTSIDE the /dashboard layout so it never triggers the
 * paywall check again.
 */

export const metadata = { title: "Sin acceso — Govbidder" };

export default function SinAccesoPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(135deg, #0A2540 0%, #143A6B 100%)",
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(600px circle at 50% 30%, rgba(215,38,61,0.07), transparent 60%)",
        }}
      />

      <div
        className="relative w-full max-w-md rounded-xl overflow-hidden text-center"
        style={{
          background: "#143A6B",
          border: "1px solid #1E3A5C",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        }}
      >
        <div className="h-1 w-full" style={{ background: "#D7263D" }} />

        <div className="p-8 space-y-6">
          {/* Icon */}
          <div className="text-5xl">🔒</div>

          <div>
            <h1
              className="text-2xl font-bold text-white mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Acceso no verificado
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: "#A8B5CC" }}>
              Tu cuenta no tiene una compra verificada asociada a{" "}
              <strong className="text-white">Govbidder</strong>.
            </p>
          </div>

          <div
            className="rounded-lg p-4 text-left space-y-2 text-sm"
            style={{
              background: "rgba(255,214,10,0.06)",
              border: "1px solid rgba(255,214,10,0.2)",
            }}
          >
            <p className="font-semibold text-white">¿Ya compraste el acceso?</p>
            <p style={{ color: "#A8B5CC" }}>
              Asegurate de iniciar sesión con el mismo email que usaste al
              comprar. Si el problema persiste, escribinos a{" "}
              <a
                href="mailto:soporte@govbidder.com"
                className="text-[#FFD60A] underline"
              >
                soporte@govbidder.com
              </a>
              .
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <a
              href="https://govbidder.com/challenge"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-lg font-bold text-base text-center"
              style={{
                background: "#D7263D",
                color: "#fff",
                boxShadow: "0 4px 20px rgba(215,38,61,0.4)",
              }}
            >
              Obtener acceso al Challenge →
            </a>

            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg text-sm font-medium text-center"
                style={{
                  background: "transparent",
                  color: "#A8B5CC",
                  border: "1px solid #1E3A5C",
                  cursor: "pointer",
                }}
              >
                Cerrar sesión e intentar con otro email
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
