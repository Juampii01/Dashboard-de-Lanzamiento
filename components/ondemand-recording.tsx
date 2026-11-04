/**
 * Clase grabada embebida (On Demand). Va arriba de cada día y, con `intro`,
 * en el Inicio como video introductorio. Si todavía no hay link, muestra
 * "próximamente" en lugar del video.
 */
export function OndemandRecording({
  videoId,
  title,
  kicker,
}: {
  videoId: string | null;
  title: string;
  kicker: string;
}) {
  return (
    <section
      className="gb-elev"
      style={{
        borderRadius: 16,
        border: "1px solid var(--border)",
        background: "var(--card)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "16px 20px 12px" }}>
        <p style={{
          fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
          letterSpacing: "0.14em", textTransform: "uppercase", color: "#E42D2C", margin: 0,
        }}>
          {kicker}
        </p>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, margin: "4px 0 0", color: "var(--foreground)" }}>
          {title}
        </h2>
      </div>
      {videoId ? (
        <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", background: "#000" }}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
          />
        </div>
      ) : (
        <div style={{
          aspectRatio: "16 / 9", display: "grid", placeItems: "center",
          background: "color-mix(in srgb, var(--muted) 60%, transparent)",
          color: "var(--muted-foreground)", fontSize: 14, fontWeight: 600,
        }}>
          La grabación estará disponible muy pronto.
        </div>
      )}
    </section>
  );
}
