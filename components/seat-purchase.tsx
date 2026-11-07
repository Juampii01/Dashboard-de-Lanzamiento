"use client";

import { useEffect, useState } from "react";
import { CreditCard, Loader2, UserPlus, X } from "lucide-react";

type Req = { id: string; partner_name: string; partner_email: string; status: "unpaid" | "paid" | "active"; payUrl: string | null };

const ERRORS: Record<string, string> = {
  invalid_data: "Revisa el nombre y el email de tu socio.",
  own_email: "Ese es tu propio email: usa el de tu socio.",
  email_has_account: "Ese email ya tiene una cuenta en la plataforma.",
  email_has_purchase: "Ese email ya tiene su acceso comprado.",
  email_in_use: "Otra persona ya está sumando a ese email.",
  limit: "Tienes demasiados pagos pendientes. Completa o cancela alguno.",
  disabled: "Esta opción no está disponible en este momento.",
  no_access: "Tu cuenta todavía no tiene acceso a la plataforma.",
};

const STATUS: Record<Req["status"], { label: string; color: string }> = {
  unpaid: { label: "Falta pagar", color: "#E8B931" },
  paid: { label: "Pagado · falta que se registre", color: "#5BA8FF" },
  active: { label: "Activo", color: "#3ECF8E" },
};

// Sección del perfil: comprarle el acceso al challenge a un socio (segundo participante).
// Solo aparece si el equipo cargó el link de pago (app_settings.seat_payment_url).
export function SeatPurchase() {
  const [enabled, setEnabled] = useState(false);
  const [price, setPrice] = useState<string | null>(null);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function load() {
    fetch("/api/seats")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setEnabled(d.enabled);
          setPrice(d.priceLabel);
          setReqs(d.requests);
        }
      })
      .catch(() => {});
  }
  useEffect(load, []);

  if (!enabled && reqs.length === 0) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/seats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_name: name.trim(), partner_email: email.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.payUrl) {
        setMsg(ERRORS[d.error] ?? "No pudimos preparar el pago. Intenta de nuevo.");
        setBusy(false);
        return;
      }
      window.location.href = d.payUrl; // Stripe
    } catch {
      setMsg("No pudimos conectarnos. Intenta de nuevo.");
      setBusy(false);
    }
  }

  async function cancel(r: Req) {
    if (!confirm(`¿Cancelar el pago pendiente para ${r.partner_email}?`)) return;
    await fetch(`/api/seats?id=${encodeURIComponent(r.id)}`, { method: "DELETE" }).catch(() => {});
    load();
  }

  const label = { display: "block", fontSize: "10px", fontWeight: 600, color: "#A0BCDE", letterSpacing: "0.08em", marginBottom: "6px" } as const;
  const box = {
    display: "flex", alignItems: "center", gap: "8px",
    background: "rgba(7,21,37,0.7)", border: "1px solid rgba(30,58,92,0.45)",
    borderRadius: "8px", padding: "6px 6px 6px 12px",
  } as const;
  const input = { flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", fontSize: "12.5px", color: "#E6EEF8", padding: "4px 0" } as const;

  return (
    <div>
      <label style={label}>SUMA UN SEGUNDO PARTICIPANTE{price ? ` · ${price}` : ""}</label>
      <p style={{ fontSize: "11.5px", color: "#5A7A96", margin: "0 0 8px", lineHeight: 1.45 }}>
        Compra el acceso al challenge para tu socio o alguien de tu equipo. Tendrá su propia cuenta: hace sus días, suma sus
        puntos y compite en el ranking. Le enviamos el link de registro apenas se confirma el pago.
      </p>

      {reqs.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
          {reqs.map((r) => (
            <div key={r.id} style={box}>
              <UserPlus style={{ width: 13, height: 13, color: "#5A7A96", flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0, fontSize: "12.5px", color: "#A0BCDE", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.partner_name} · {r.partner_email}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: STATUS[r.status].color, flexShrink: 0 }}>{STATUS[r.status].label}</span>
              {r.status === "unpaid" && r.payUrl && (
                <a href={r.payUrl} style={{ fontSize: 11.5, fontWeight: 700, color: "#fff", background: "#D7263D", borderRadius: 6, padding: "4px 8px", textDecoration: "none", flexShrink: 0 }}>
                  Pagar
                </a>
              )}
              {r.status === "unpaid" && (
                <button type="button" onClick={() => cancel(r)} title="Cancelar" style={{ display: "inline-flex", background: "none", border: "none", color: "#5A7A96", cursor: "pointer", padding: 4 }}>
                  <X style={{ width: 14, height: 14 }} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {enabled && (
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={box}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre y apellido de tu socio" required minLength={2} style={input} />
          </div>
          <div style={box}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email de tu socio" required style={input} />
            <button
              type="submit"
              disabled={busy || !email.trim() || name.trim().length < 2}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0,
                background: "#D7263D", color: "#fff", border: "none", borderRadius: 6,
                padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: busy ? "wait" : "pointer",
                opacity: busy || !email.trim() || name.trim().length < 2 ? 0.6 : 1,
              }}
            >
              {busy ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : <CreditCard style={{ width: 13, height: 13 }} />}
              Pagar{price ? ` ${price}` : ""}
            </button>
          </div>
          <p style={{ fontSize: "11px", color: "#5A7A96", margin: 0 }}>
            En la página de pago deja el email de tu socio: así su acceso se activa al instante.
          </p>
        </form>
      )}

      {msg && <p style={{ fontSize: "11.5px", marginTop: 6, color: "#FF6B7A" }}>{msg}</p>}
    </div>
  );
}
