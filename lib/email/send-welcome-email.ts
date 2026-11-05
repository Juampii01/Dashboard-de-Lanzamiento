/**
 * Email de bienvenida al comprar (llega por el webhook de GoHighLevel).
 * Lleva al registro del dominio del programa: la persona crea su cuenta con el
 * MISMO email con el que pagó y el acceso se activa al instante.
 */
import { baseUrlForProgram, type Program } from "@/lib/program";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM = "Tu Primer Contrato Challenge <acceso@send.govbidder.net>";
const LOGO = "https://dboard.govbidder.net/tpc-logo.png";

export async function sendWelcomeEmail(opts: {
  to: string;
  name?: string | null;
  program: Program;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY no configurada" };

  const ondemand = opts.program === "ondemand";
  const registerUrl = `${baseUrlForProgram(opts.program)}/registro`;
  const hello = opts.name?.trim() ? `¡Hola, ${escapeHtml(opts.name.trim().split(" ")[0])}!` : "¡Hola!";
  const what = ondemand
    ? "Gracias por comprar la versión grabada del Tu Primer Contrato Challenge. Ya puedes empezar: las clases de los 4 días y la plataforma te esperan."
    : "Gracias por tu compra del Tu Primer Contrato Challenge. Crea tu cuenta ahora para tener todo listo el día del lanzamiento.";
  const eyebrow = ondemand ? "On Demand · Compra confirmada" : "Compra confirmada";
  const subject = ondemand
    ? "Crea tu cuenta y empieza el Tu Primer Contrato Challenge"
    : "Crea tu cuenta del Tu Primer Contrato Challenge";

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0d1a3d;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0d1a3d;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
        <tr><td style="height:4px;background:#E42D2C;line-height:4px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="padding:32px 32px 8px;text-align:center;">
          <img src="${LOGO}" alt="Tu Primer Contrato Challenge" width="110" style="display:inline-block;height:auto;max-width:110px;" />
        </td></tr>
        <tr><td style="padding:8px 32px 0;text-align:center;">
          <p style="margin:0;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#E42D2C;">${eyebrow}</p>
          <h1 style="margin:10px 0 0;font-size:22px;color:#0d1a3d;">Crea tu cuenta</h1>
        </td></tr>
        <tr><td style="padding:14px 32px 0;text-align:center;">
          <p style="margin:0;font-size:15px;line-height:1.55;color:#475569;">${hello} ${what}</p>
        </td></tr>
        <tr><td style="padding:18px 32px 0;">
          <p style="margin:0;padding:12px 14px;border-radius:10px;background:#FFF8E1;font-size:13.5px;line-height:1.5;color:#7a5b00;">
            <strong>Importante:</strong> regístrate con este mismo email (<strong>${escapeHtml(opts.to)}</strong>). Así tu acceso se activa al instante.
          </p>
        </td></tr>
        <tr><td style="padding:24px 32px 8px;text-align:center;">
          <a href="${registerUrl}" target="_blank"
             style="display:inline-block;background:#E42D2C;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;padding:14px 32px;border-radius:10px;">
            Crear mi cuenta →
          </a>
        </td></tr>
        <tr><td style="padding:18px 32px 28px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">Si el botón no funciona, copia este link: ${registerUrl}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [opts.to], subject, html }),
    });
    if (!res.ok) return { ok: false, error: `Resend ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "network_error" };
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
