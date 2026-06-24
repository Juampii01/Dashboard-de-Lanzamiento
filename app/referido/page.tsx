import { ReferidoForm } from "@/components/referido-form";

export const metadata = { title: "Quiero mi lugar — GovBidder Challenge" };

export default async function ReferidoPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const sp = await searchParams;
  const ref = (sp?.ref ?? "").trim();

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px 16px",
        background: "radial-gradient(800px circle at 50% 0%, rgba(228,45,44,0.14), transparent 55%), linear-gradient(160deg, #0d1a3d 0%, #080f24 100%)",
      }}
    >
      <div
        style={{
          width: "min(440px, 100%)",
          display: "flex", flexDirection: "column", alignItems: "center",
          textAlign: "center", gap: 16,
          background: "linear-gradient(160deg, rgba(13,26,61,0.6) 0%, rgba(8,15,36,0.6) 100%)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 22, padding: "clamp(28px, 6vw, 44px) clamp(20px, 5vw, 36px)",
          boxShadow: "0 30px 80px -24px rgba(0,0,0,0.7)",
        }}
      >
        <div style={{ background: "#fff", borderRadius: 16, padding: "10px 16px", boxShadow: "0 8px 28px rgba(0,0,0,0.35)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/halcon.png" alt="GovBidder Challenge" style={{ height: 54, width: "auto", display: "block" }} />
        </div>

        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#FFD700" }}>
          GovBidder Challenge
        </p>

        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px, 6vw, 32px)", fontWeight: 800, color: "#fff", lineHeight: 1.12, margin: 0 }}>
          Quiero mi lugar
        </h1>

        <p style={{ fontSize: 14.5, color: "rgba(255,255,255,0.78)", lineHeight: 1.55, margin: 0 }}>
          Coloque acá su email y será redirigido a la página para acceder al lanzamiento.
        </p>

        <ReferidoForm refCode={ref} />
      </div>
    </div>
  );
}
