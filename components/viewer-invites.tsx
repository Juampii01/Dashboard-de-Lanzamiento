"use client";

import { useEffect, useState } from "react";
import { Eye, Loader2, Send, X } from "lucide-react";

type Invite = { id: string; email: string; status: "pending" | "active" };

const ERRORS: Record<string, string> = {
  invalid_email: "Escribe un email válido.",
  own_email: "No puedes invitarte a ti mismo.",
  limit: "Ya invitaste al máximo de personas.",
  email_has_account: "Ese email ya tiene una cuenta en la plataforma.",
  already_invited: "Ese email ya tiene una invitación activa.",
  email_failed: "No pudimos enviar el email. Intenta de nuevo.",
  no_access: "Tu cuenta todavía no tiene acceso a la plataforma.",
};

// Sección del perfil: invitar a alguien a ver tu cuenta en modo solo lectura.
export function ViewerInvites() {
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [max, setMax] = useState(2);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  function load() {
    fetch("/api/viewers")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setInvites(d.invites);
          setMax(d.max);
        } else setInvites([]);
      })
      .catch(() => setInvites([]));
  }
  useEffect(load, []);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/viewers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setMsg({ tone: "error", text: ERRORS[d.error] ?? "No se pudo enviar la invitación." });
      else {
        setMsg({ tone: "ok", text: `Invitación enviada a ${email.trim()}.` });
        setEmail("");
        load();
      }
    } catch {
      setMsg({ tone: "error", text: "No pudimos conectarnos. Intenta de nuevo." });
    }
    setBusy(false);
  }

  async function revoke(inv: Invite) {
    const what = inv.status === "active" ? `quitarle el acceso a ${inv.email}` : `cancelar la invitación a ${inv.email}`;
    if (!confirm(`¿Seguro que quieres ${what}?`)) return;
    setBusy(true);
    await fetch(`/api/viewers?id=${encodeURIComponent(inv.id)}`, { method: "DELETE" }).catch(() => {});
    setBusy(false);
    load();
  }

  const full = (invites?.length ?? 0) >= max;
  const label = { display: "block", fontSize: "10px", fontWeight: 600, color: "#A0BCDE", letterSpacing: "0.08em", marginBottom: "6px" } as const;
  const box = {
    display: "flex", alignItems: "center", gap: "8px",
    background: "rgba(7,21,37,0.7)", border: "1px solid rgba(30,58,92,0.45)",
    borderRadius: "8px", padding: "6px 6px 6px 12px",
  } as const;

  return (
    <div>
      <label style={label}>INVITA A ALGUIEN A VER TU CUENTA</label>
      <p style={{ fontSize: "11.5px", color: "#5A7A96", margin: "0 0 8px", lineHeight: 1.45 }}>
        Ve lo mismo que tú (tu avance, tu perfil y tus documentos) pero no puede hacer cambios ni sumar puntos. Máximo {max} personas.
      </p>

      {invites && invites.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
          {invites.map((inv) => (
            <div key={inv.id} style={box}>
              <Eye style={{ width: 13, height: 13, color: "#5A7A96", flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0, fontSize: "12.5px", color: "#A0BCDE", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {inv.email}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: inv.status === "active" ? "#3ECF8E" : "#E8B931", flexShrink: 0 }}>
                {inv.status === "active" ? "Activo" : "Invitado"}
              </span>
              <button
                type="button"
                onClick={() => revoke(inv)}
                disabled={busy}
                title={inv.status === "active" ? "Quitar acceso" : "Cancelar invitación"}
                style={{ display: "inline-flex", background: "none", border: "none", color: "#5A7A96", cursor: "pointer", padding: 4 }}
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {!full && (
        <form onSubmit={invite} style={box}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@ejemplo.com"
            required
            style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", fontSize: "12.5px", color: "#E6EEF8" }}
          />
          <button
            type="submit"
            disabled={busy || !email.trim()}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0,
              background: "#D7263D", color: "#fff", border: "none", borderRadius: 6,
              padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: busy ? "wait" : "pointer", opacity: busy || !email.trim() ? 0.6 : 1,
            }}
          >
            {busy ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : <Send style={{ width: 13, height: 13 }} />}
            Invitar
          </button>
        </form>
      )}

      {msg && (
        <p style={{ fontSize: "11.5px", marginTop: 6, color: msg.tone === "ok" ? "#3ECF8E" : "#FF6B7A" }}>{msg.text}</p>
      )}
    </div>
  );
}
