/**
 * Email para crear o restablecer la contraseña (vía Resend, mismo remitente
 * verificado que el resto de los emails de acceso).
 *
 * Lo usan:
 *   - quien olvidó su contraseña
 *   - participantes de lanzamientos anteriores que entraban con link por email
 *     y nunca tuvieron contraseña
 */
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM = "GovBidder Challenge <acceso@send.govbidder.net>";
const SUBJECT = "Crea tu contraseña del GovBidder Challenge";
const LOGO = "https://dboard.govbidder.net/halcon.png";

export async function sendPasswordEmail(opts: { to: string; link: string }): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY no configurada" };
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [opts.to], subject: SUBJECT, html: buildHtml(opts.link) }),
    });
    if (!res.ok) return { ok: false, error: `Resend ${res.status}: ${(await res.text().catch(() => "")).slice(0, 240)}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "network_error" };
  }
}

function buildHtml(link: string): string {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0d1a3d;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0d1a3d;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
        <tr><td style="height:4px;background:#E42D2C;line-height:4px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="padding:32px 32px 8px;text-align:center;">
          <img src="${LOGO}" alt="GovBidder Challenge" width="110" style="display:inline-block;height:auto;max-width:110px;" />
        </td></tr>
        <tr><td style="padding:8px 32px 0;text-align:center;">
          <p style="margin:0;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#E42D2C;">GovBidder Challenge</p>
          <h1 style="margin:10px 0 0;font-size:22px;color:#0d1a3d;">Crea tu contraseña</h1>
        </td></tr>
        <tr><td style="padding:14px 32px 0;text-align:center;">
          <p style="margin:0;font-size:15px;line-height:1.55;color:#475569;">
            Recibimos una solicitud para crear o cambiar la contraseña de tu cuenta. Haz clic en el botón y elige una contraseña nueva. Después podrás entrar siempre con tu email y esa contraseña.
          </p>
        </td></tr>
        <tr><td style="padding:26px 32px 8px;text-align:center;">
          <a href="${link}" target="_blank"
             style="display:inline-block;background:#E42D2C;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;padding:14px 32px;border-radius:10px;">
            Crear contraseña →
          </a>
        </td></tr>
        <tr><td style="padding:18px 32px 6px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
          <p style="margin:6px 0 0;font-size:12px;word-break:break-all;"><a href="${link}" style="color:#152978;">${link}</a></p>
        </td></tr>
        <tr><td style="padding:22px 32px 28px;text-align:center;border-top:1px solid #eef1f6;">
          <p style="margin:14px 0 0;font-size:11px;color:#94a3b8;">El enlace es de un solo uso y vence por seguridad. Si no pediste esto, puedes ignorar este email: tu contraseña no cambia.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
