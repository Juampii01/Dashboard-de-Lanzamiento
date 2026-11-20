"use client";

import Link from "next/link";

// Página "Tu próximo paso" (2da edición del Challenge, Black Friday).
// Diseño entregado por el equipo (tu-proximo-paso.html), pasado a React.

// Número de WhatsApp de la mentoría (solo dígitos, con código de país, sin
// "+"). Configurable por env NEXT_PUBLIC_MENTORIA_WHATSAPP.
const MENTORIA_WHATSAPP = (process.env.NEXT_PUBLIC_MENTORIA_WHATSAPP ?? "17329373088").replace(/\D/g, "");

// Link de pago directo. Configurable por env NEXT_PUBLIC_MENTORIA_PAYMENT_LINK.
const PAYMENT_LINK = process.env.NEXT_PUBLIC_MENTORIA_PAYMENT_LINK ?? "https://payments.govbidder.net/tpcusa";

const BONOS = [
  { img: "/proximo-paso/dfy.webp", titulo: "Servicio Done For You", texto: "Nuestro equipo de GovBidder pone manos a la obra contigo. No cargas el proceso solo: lo trabajamos juntos." },
  { img: "/proximo-paso/ia.webp", titulo: "GovBidder.AI", texto: "Tu agente de IA para ganar contratos: encuentra oportunidades, analiza requisitos y prepara propuestas con inteligencia artificial." },
  { img: "/proximo-paso/connect.webp", titulo: "GovBidder Connect", texto: "Busca oportunidades federales y estatales, recibe alertas, guarda las que te interesan y sigue el crecimiento de tu negocio." },
  { img: "/proximo-paso/plat.webp", titulo: "Plataforma del Challenge", texto: "Sigues con acceso a la plataforma del Tu Primer Contrato Challenge y a todo lo que construiste en estos 4 días." },
];

const CSS = `
.tpc-wrap{--navy:#070d24;--card:#0f1733;--line:rgba(255,255,255,.12);--red:#e3262f;--green:#25d366;--muted:#b9c0d6;
  font-family:var(--font-sans),system-ui,sans-serif;background:radial-gradient(1200px 600px at 50% -10%,#14204a 0%,var(--navy) 60%);
  color:#fff;padding:48px 20px 64px;line-height:1.55;-webkit-font-smoothing:antialiased;border-radius:20px}
.tpc-wrap *{box-sizing:border-box}
.tpc-in{max-width:680px;margin:0 auto;text-align:center}
.tpc-logo{display:inline-block;background:#fff;border-radius:16px;padding:10px 16px;margin:0 auto 22px;box-shadow:0 8px 28px rgba(0,0,0,.35)}
.tpc-logo img{height:54px;width:auto;display:block}
.tpc-eyebrow{color:var(--red);font-weight:800;font-size:12px;letter-spacing:.14em;text-transform:uppercase;margin:0 0 14px}
.tpc-h1{font-size:clamp(30px,6vw,44px);font-weight:900;line-height:1.12;margin:0 0 18px}
.tpc-h1 span{color:var(--red)}
.tpc-sub{font-size:18px;color:#e6e9f3;margin:0 auto 22px;max-width:560px}
.tpc-p{font-size:16px;color:var(--muted);margin:0 auto 14px;max-width:560px}
.tpc-p b{color:#fff}
.tpc-card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:28px 24px;margin:34px 0 0;text-align:left}
.tpc-card h2{font-size:22px;font-weight:900;margin:0 0 4px}
.tpc-card h2 span{color:var(--red)}
.tpc-tag{font-style:italic;color:var(--muted);font-size:14px;margin:0 0 20px;padding-bottom:16px;border-bottom:1px solid var(--line)}
.tpc-list{list-style:none;margin:0;padding:0}
.tpc-list li{display:flex;gap:12px;margin:0 0 16px;font-size:15px;color:var(--muted)}
.tpc-list li .ic{flex:0 0 26px;font-size:18px;line-height:1.3}
.tpc-list li b{color:#fff;display:block;font-size:15.5px}
.tpc-days{display:block;margin-top:4px;color:#dfe3ef}
.tpc-bonus{background:linear-gradient(180deg,rgba(227,38,47,.12),rgba(227,38,47,.03));border-color:rgba(227,38,47,.35)}
.tpc-bonus .tpc-tag{border-color:rgba(227,38,47,.25)}
.tpc-bgrid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.tpc-b{background:rgba(255,255,255,.04);border:1px solid var(--line);border-radius:14px;padding:16px;display:flex;flex-direction:column}
.tpc-b .pic{background:radial-gradient(closest-side,rgba(255,255,255,.9),rgba(255,255,255,.55) 60%,rgba(255,255,255,0) 100%);
  border-radius:12px;height:200px;display:flex;align-items:center;justify-content:center;margin:0 0 14px}
.tpc-b .pic img{max-width:100%;max-height:190px;object-fit:contain;display:block}
.tpc-b .lbl{color:var(--red);font-weight:900;font-size:11.5px;letter-spacing:.12em;margin:0 0 4px}
.tpc-b h3{font-size:17px;font-weight:900;margin:0 0 6px;color:#fff}
.tpc-b p{font-size:14px;color:var(--muted);margin:0}
.tpc-b:first-child,.tpc-b:last-child:nth-child(even){grid-column:1/-1;flex-direction:row;gap:18px;align-items:center}
.tpc-b:first-child .pic,.tpc-b:last-child:nth-child(even) .pic{flex:0 0 42%;margin:0;height:240px}
.tpc-b:first-child .pic img,.tpc-b:last-child:nth-child(even) .pic img{max-height:230px}
@media(max-width:560px){.tpc-bgrid{grid-template-columns:1fr}.tpc-b:first-child,.tpc-b:last-child:nth-child(even){flex-direction:column}.tpc-b:first-child .pic,.tpc-b:last-child:nth-child(even) .pic{flex:none;width:100%;margin:0 0 14px}}
.tpc-price{margin:34px 0 0;padding:28px 22px;border-radius:18px;border:1px solid rgba(37,211,102,.35);background:rgba(37,211,102,.06)}
.tpc-unlock{font-weight:800;font-size:15px;margin:0 0 14px}
.tpc-old{color:var(--muted);font-size:16px;margin:0}
.tpc-old s{color:#8b93ad}
.tpc-new{font-size:15px;font-weight:700;margin:6px 0 0;color:#dfe3ef}
.tpc-big{display:block;font-size:56px;font-weight:900;line-height:1.05;color:#fff;margin:4px 0 10px}
.tpc-save{display:inline-block;background:var(--green);color:#06210f;font-weight:900;font-size:16px;border-radius:999px;padding:8px 18px;margin:0 0 14px}
.tpc-why{font-size:14.5px;color:var(--muted);max-width:500px;margin:0 auto}
.tpc-urg{display:inline-block;margin:26px 0 22px;border:1px solid rgba(227,38,47,.5);background:rgba(227,38,47,.08);color:#ff5a62;
  font-weight:800;font-size:12px;letter-spacing:.1em;text-transform:uppercase;border-radius:999px;padding:9px 18px}
.tpc-btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.tpc-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-width:250px;padding:17px 26px;border-radius:12px;border:none;cursor:pointer;
  font-weight:800;font-size:16px;font-family:inherit;text-decoration:none;transition:transform .15s ease,box-shadow .15s ease}
.tpc-btn:hover{transform:translateY(-2px)}
.tpc-pay{background:var(--red);color:#fff;box-shadow:0 10px 28px rgba(227,38,47,.35)}
.tpc-wa{background:var(--green);color:#06210f;box-shadow:0 10px 28px rgba(37,211,102,.25)}
.tpc-wa svg{width:20px;height:20px}
.tpc-small{font-size:13.5px;color:var(--muted);margin:16px auto 0;max-width:520px}
.tpc-close{margin:44px auto 0;max-width:540px;font-size:17px;color:#e6e9f3}
.tpc-sign{margin:14px 0 0;font-size:13px;color:var(--muted);letter-spacing:.06em}
.tpc-sign b{color:var(--red)}
@media(max-width:520px){.tpc-btn{min-width:100%}.tpc-card{padding:24px 18px}.tpc-big{font-size:48px}}
`;

export function ProximoPasoUnlocked({ fullName }: { fullName: string }) {
  function trackClick(button: "pagar_ahora" | "whatsapp") {
    fetch("/api/proximo-paso/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ button }),
      keepalive: true,
    }).catch(() => {});
  }

  function handleWhatsApp() {
    trackClick("whatsapp");
    const name = (fullName || "").trim();
    const msg = `Hola${name ? `, soy ${name}` : ""}. Terminé el Challenge y tengo preguntas sobre la Mentoría Tu Primer Contrato USA.`;
    window.open(`https://wa.me/${MENTORIA_WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm transition-colors"
        style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-sans)" }}
      >
        ← Dashboard
      </Link>

      <style>{CSS}</style>

      <section className="tpc-wrap">
        <div className="tpc-in">
          <div className="tpc-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tpc-logo.png" alt="Tu Primer Contrato" />
          </div>

          <p className="tpc-eyebrow">2da Edición · Tu Primer Contrato Challenge · Completado ✅</p>

          <h1 className="tpc-h1">Entraste como Challenger.<br />Hoy sales como <span>GovBidder.</span></h1>

          <p className="tpc-sub">En 4 días hiciste lo que la mayoría de los empresarios deja para &quot;algún día&quot;: pusiste tu empresa lista para licitar con el Gobierno de Estados Unidos.</p>

          <p className="tpc-p">Ahora viene la parte que separa a los que se preparan de los que facturan.</p>
          <p className="tpc-p">Porque el gobierno no le paga a la empresa más preparada. <b>Le paga a la que se presenta, responde a tiempo y sabe cómo moverse.</b></p>
          <p className="tpc-p"><b>Lo que viene ya no lo vas a hacer solo.</b></p>

          <div className="tpc-card">
            <h2>Mentoría <span>Tu Primer Contrato USA</span></h2>
            <p className="tpc-tag">De empresa lista a empresa compitiendo.</p>
            <ul className="tpc-list">
              <li><span className="ic">🎯</span><div><b>Revisión de oportunidades reales</b>Buscamos juntos licitaciones abiertas que encajen con tu empresa y te decimos cuáles valen la pena.</div></li>
              <li><span className="ic">📝</span><div><b>Apoyo con tus propuestas</b>No mandas nada a ciegas: te acompañamos a armarla.</div></li>
              <li><span className="ic">📅</span><div><b>Clases en vivo cada semana</b><span className="tpc-days">Lunes · Marketing Gubernamental<br />Martes · Finanzas<br />Miércoles · Licitando</span></div></li>
              <li><span className="ic">🎤</span><div><b>Invitados expertos</b>Crédito y financiamiento, ahorro en taxes para tu empresa, Banco Infinito y más. Porque ganar contratos también es saber manejar el dinero que entra.</div></li>
              <li><span className="ic">🎓</span><div><b>Acceso a GovBidder Academy</b>Todas las clases grabadas, disponibles cuando las necesites.</div></li>
            </ul>
          </div>

          <div className="tpc-card tpc-bonus">
            <h2>🎁 Bonos de esta edición</h2>
            <p className="tpc-tag">Solo para quienes completaron el Challenge.</p>
            <div className="tpc-bgrid">
              {BONOS.map((b, i) => (
                <div className="tpc-b" key={b.titulo}>
                  <div className="pic">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img loading="lazy" alt={b.titulo} src={b.img} />
                  </div>
                  <div>
                    <p className="lbl">🎁 BONO {String(i + 1).padStart(2, "0")}</p>
                    <h3>{b.titulo}</h3>
                    <p>{b.texto}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="tpc-price">
            <p className="tpc-unlock">🔓 Tu certificado de GovBidder desbloquea esta oferta</p>
            <p className="tpc-old">Precio regular: <s>$3,597</s></p>
            <p className="tpc-new">Precio con tu certificado:</p>
            <span className="tpc-big">$2,497</span>
            <span className="tpc-save">🎓 Tu certificado te ahorra $1,100</span>
            <p className="tpc-why">Te lo ganaste al completar los 4 días del Challenge. Este precio es solo para quienes llegaron hasta el final y es parte de la oferta de Black Friday.</p>
          </div>

          <span className="tpc-urg">⏳ Cupos limitados · Se asignan por orden de llegada</span>

          <div className="tpc-btns">
            <a className="tpc-btn tpc-pay" href={PAYMENT_LINK} target="_blank" rel="noopener noreferrer" onClick={() => trackClick("pagar_ahora")}>
              QUIERO MI PRIMER CONTRATO →
            </a>
            <button type="button" className="tpc-btn tpc-wa" onClick={handleWhatsApp}>
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.79-1.31l-.34-.2-3.56.93.95-3.47-.22-.36A9.4 9.4 0 0 1 2.64 12C2.64 6.8 6.87 2.58 12.06 2.58c2.51 0 4.87.98 6.65 2.76a9.35 9.35 0 0 1 2.75 6.66c0 5.19-4.23 9.41-9.41 9.41M20.06 3.98A11.3 11.3 0 0 0 12.05.67C5.82.67.74 5.74.74 11.98c0 2 .52 3.94 1.51 5.65L.65 23.33l5.83-1.53a11.3 11.3 0 0 0 5.57 1.42c6.24 0 11.31-5.07 11.32-11.31 0-3.02-1.18-5.86-3.31-8" /></svg>
              Tengo preguntas, hablar con el equipo
            </button>
          </div>
          <p className="tpc-small">Si ya lo decidiste, paga y te enviamos tu acceso por email. Si tienes dudas o quieres ver otras formas de pago, escríbenos por WhatsApp y te atendemos personalmente.</p>

          <p className="tpc-close">Hace 4 días no sabías por dónde empezar. Hoy tienes tu empresa lista.<br /><b>Imagínate dónde puedes estar en unos meses con alguien que ya ganó contratos caminando a tu lado.</b></p>
          <p className="tpc-sign">SANTO CONTRATOS · <b>THE BID THAT WINS</b></p>
        </div>
      </section>
    </div>
  );
}
