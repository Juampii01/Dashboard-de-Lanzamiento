"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, CheckCircle2, Clock, CreditCard, Loader2, UserPlus, XCircle } from "lucide-react";

type Status = "requested" | "approved" | "rejected" | "paid";
type Req = {
  id: string;
  partner_name: string;
  partner_email: string;
  company_name: string | null;
  status: Status;
  priceLabel: string | null;
  payUrl: string | null;
  adminNote: string | null;
  active: boolean;
};

const ERRORS: Record<string, string> = {
  invalid_data: "Revisa el nombre y el email de la persona.",
  own_email: "Ese es tu propio email: usa el de la otra persona.",
  email_has_account: "Ese email ya tiene su acceso activo en la plataforma.",
  email_has_purchase: "Ese email ya tiene su acceso comprado.",
  email_in_use: "Otra persona ya pidió una cotización para ese email.",
  already_requested: "Ya pediste una cotización para ese email.",
  limit: "Tienes varias solicitudes abiertas. Espera la respuesta o cancela alguna.",
  no_access: "Tu cuenta todavía no tiene acceso a la plataforma.",
};

const card: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: "22px 22px",
};
const labelStyle: React.CSSProperties = { display: "block", fontSize: 14, fontWeight: 700, color: "var(--foreground)", marginBottom: 6 };
const inputStyle: React.CSSProperties = {
  width: "100%",
  fontSize: 16,
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--background)",
  color: "var(--foreground)",
  outline: "none",
};

function StatusLine({ r }: { r: Req }) {
  if (r.status === "requested")
    return (
      <p style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 15, color: "var(--muted-foreground)", margin: 0 }}>
        <Clock size={18} /> Estamos preparando tu cotización. Te avisamos por email cuando esté lista.
      </p>
    );
  if (r.status === "rejected")
    return (
      <p style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 15, color: "var(--muted-foreground)", margin: 0 }}>
        <XCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>No pudimos aprobar esta solicitud.{r.adminNote ? ` ${r.adminNote}` : " Escríbenos por soporte si tienes dudas."}</span>
      </p>
    );
  if (r.status === "paid")
    return (
      <p style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 15, color: "var(--success)", fontWeight: 700, margin: 0 }}>
        <CheckCircle2 size={18} />
        {r.active ? "Activo: ya tiene su cuenta en la plataforma." : "Pagado. Le enviamos el link para crear su cuenta."}
      </p>
    );
  return null;
}

export function PerfilAdicionalClient() {
  const [reqs, setReqs] = useState<Req[] | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    fetch("/api/seats")
      .then((r) => r.json())
      .then((d) => setReqs(d.ok ? d.requests : []))
      .catch(() => setReqs([]));
  }, []);
  useEffect(load, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/seats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_name: name.trim(), partner_email: email.trim(), company_name: company.trim(), message: message.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: ERRORS[d.error] ?? "No pudimos enviar tu solicitud. Intenta de nuevo." });
      } else {
        setMsg({ ok: true, text: "¡Listo! Recibimos tu solicitud. Te avisamos por email cuando tu cotización esté lista." });
        setName("");
        setEmail("");
        setCompany("");
        setMessage("");
        load();
      }
    } catch {
      setMsg({ ok: false, text: "No pudimos conectarnos. Intenta de nuevo." });
    }
    setBusy(false);
  }

  async function cancel(r: Req) {
    if (!confirm(`¿Cancelar la solicitud para ${r.partner_name}?`)) return;
    await fetch(`/api/seats?id=${encodeURIComponent(r.id)}`, { method: "DELETE" }).catch(() => {});
    load();
  }

  const canSend = name.trim().length >= 2 && /\S+@\S+\.\S+/.test(email.trim()) && !busy;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <p style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--primary)", margin: 0 }}>
          Perfil adicional
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--foreground)", margin: "6px 0 8px", lineHeight: 1.2 }}>
          ¿Quieres registrar otra empresa o sumar a otra persona?
        </h1>
        <p style={{ fontSize: 17, lineHeight: 1.6, color: "var(--foreground)", opacity: 0.85, margin: 0 }}>
          Solicita una cotización para un perfil adicional. Lo revisamos y te mostramos aquí el precio y el botón de pago.
          Cuando se confirme el pago, esa persona recibe su link para crear su propia cuenta: hace sus días, suma sus puntos y
          participa como cualquier participante.
        </p>
      </header>

      {reqs && reqs.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--foreground)", margin: 0 }}>Tus solicitudes</h2>
          {reqs.map((r) => (
            <div key={r.id} style={{ ...card, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, display: "grid", placeItems: "center", background: "var(--muted)", flexShrink: 0 }}>
                  {r.company_name ? <Building2 size={20} /> : <UserPlus size={20} />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 17, fontWeight: 800, color: "var(--foreground)", margin: 0 }}>
                    {r.partner_name}
                    {r.company_name ? ` · ${r.company_name}` : ""}
                  </p>
                  <p style={{ fontSize: 15, color: "var(--muted-foreground)", margin: 0, overflowWrap: "anywhere" }}>{r.partner_email}</p>
                </div>
              </div>

              {r.status === "approved" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <p style={{ fontSize: 15, color: "var(--foreground)", margin: 0 }}>Tu cotización está lista:</p>
                  <p style={{ fontSize: 30, fontWeight: 900, color: "var(--foreground)", margin: 0 }}>{r.priceLabel}</p>
                  {r.adminNote && <p style={{ fontSize: 15, color: "var(--muted-foreground)", margin: 0 }}>{r.adminNote}</p>}
                  {r.payUrl && (
                    <a
                      href={r.payUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, alignSelf: "flex-start",
                        background: "var(--primary)", color: "#fff", textDecoration: "none",
                        fontSize: 17, fontWeight: 800, padding: "13px 22px", borderRadius: 12,
                      }}
                    >
                      <CreditCard size={19} /> Pagar perfil adicional
                    </a>
                  )}
                  <p style={{ fontSize: 14, color: "var(--muted-foreground)", margin: 0 }}>
                    Apenas se confirme el pago, le enviamos a {r.partner_name.split(" ")[0]} el link para crear su cuenta.
                  </p>
                </div>
              ) : (
                <StatusLine r={r} />
              )}

              {(r.status === "requested" || r.status === "approved") && (
                <button
                  type="button"
                  onClick={() => cancel(r)}
                  style={{ alignSelf: "flex-start", background: "none", border: "none", padding: 0, fontSize: 14, color: "var(--muted-foreground)", textDecoration: "underline", cursor: "pointer" }}
                >
                  Cancelar solicitud
                </button>
              )}
            </div>
          ))}
        </section>
      )}

      <form onSubmit={submit} style={{ ...card, display: "flex", flexDirection: "column", gap: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--foreground)", margin: 0 }}>Solicitar cotización</h2>
        <div>
          <label style={labelStyle} htmlFor="pa-name">Nombre y apellido de la persona</label>
          <input id="pa-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={120} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle} htmlFor="pa-email">Email con el que va a entrar</label>
          <input id="pa-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle} htmlFor="pa-company">Empresa <span style={{ fontWeight: 500, color: "var(--muted-foreground)" }}>(opcional)</span></label>
          <input id="pa-company" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={160} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle} htmlFor="pa-msg">Mensaje para el equipo <span style={{ fontWeight: 500, color: "var(--muted-foreground)" }}>(opcional)</span></label>
          <textarea id="pa-msg" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
        </div>
        <button
          type="submit"
          disabled={!canSend}
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, alignSelf: "flex-start",
            background: "var(--secondary)", color: "#fff", border: "none", borderRadius: 12,
            fontSize: 17, fontWeight: 800, padding: "13px 22px",
            cursor: canSend ? "pointer" : "not-allowed", opacity: canSend ? 1 : 0.55,
          }}
        >
          {busy ? <Loader2 size={19} className="animate-spin" /> : <UserPlus size={19} />} Solicitar cotización
        </button>
        {msg && (
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: msg.ok ? "var(--success)" : "var(--destructive)" }}>{msg.text}</p>
        )}
      </form>
    </div>
  );
}
