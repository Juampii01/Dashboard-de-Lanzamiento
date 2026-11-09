/**
 * Aviso al participante de que el equipo aprobó su cotización de perfil
 * adicional: ya puede ver el precio y pagar desde la pestaña "Perfil adicional".
 */
import { baseUrlForProgram, type Program } from "@/lib/program";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM = "Tu Primer Contrato Challenge <acceso@send.govbidder.net>";
const LOGO = "https://dboard.govbidder.net/tpc-logo.png";

export async function sendSeatQuoteEmail(opts: { to: string; name?: string | null; partnerName: string; program?: Program }): Promise<{ ok: boolean; error?: string }> {
  // El botón lleva a la pestaña "Perfil adicional" del dominio del programa.
  const LOGIN_URL = `${baseUrlForProgram(opts.program ?? "live")}/dashboard/perfil-adicional`;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY no configurada" };
  const hello = opts.name?.trim() ? `¡Hola, ${escapeHtml(opts.name.trim().split(" ")[0])}!` : "¡Hola!";
  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0d1a3d;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0d1a3d;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
        <tr><td style="height:4px;background:#16A65F;line-height:4px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="padding:32px 32px 8px;text-align:center;">
          <img src="${LOGO}" alt="Tu Primer Contrato Challenge" width="110" style="display:inline-block;height:auto;max-width:110px;" />
        </td></tr>
        <tr><td style="padding:8px 32px 0;text-align:center;">
          <p style="margin:0;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#16A65F;">Perfil adicional</p>
          <h1 style="margin:10px 0 0;font-size:22px;color:#0d1a3d;">Tu cotización está lista</h1>
        </td></tr>
        <tr><td style="padding:14px 32px 0;text-align:center;">
          <p style="margin:0;font-size:15px;line-height:1.55;color:#475569;">
            ${hello} Revisamos tu solicitud para sumar a ${escapeHtml(opts.partnerName)}. Ya puedes ver el precio y pagar desde la pestaña “Perfil adicional” del dashboard.
          </p>
        </td></tr>
        <tr><td style="padding:26px 32px 8px;text-align:center;">
          <a href="${LOGIN_URL}" target="_blank"
             style="display:inline-block;background:#E42D2C;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;padding:14px 32px;border-radius:10px;">
            Ver mi cotización →
          </a>
        </td></tr>
        <tr><td style="padding:22px 32px 28px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">Apenas se confirme el pago, le enviamos a esa persona el link para crear su cuenta.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [opts.to], subject: "Tu cotización de perfil adicional está lista", html }),
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
