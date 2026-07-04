/**
 * Email masivo con la propuesta de la mentoría "Tu Primer Contrato" (plan de
 * pagos) — mismo mensaje que el banner de Inicio, pero por email. El CTA es
 * un link de WhatsApp con el mensaje pre-armado (no un magic link: el objetivo
 * acá es que escriban por WhatsApp, no que entren al dashboard).
 *
 * Requiere RESEND_API_KEY (en Vercel). Remitente propio para no agruparse en
 * el mismo hilo que los otros emails masivos.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM = "GovBidder Challenge <mentoria@send.govbidder.net>";
const SUBJECT = "¿Todavía pensás unirte a Tu Primer Contrato?";

const MENTORIA_WHATSAPP = (process.env.NEXT_PUBLIC_MENTORIA_WHATSAPP ?? "17329373088").replace(/\D/g, "");

function buildWhatsAppLink(fullName: string): string {
  const name = (fullName || "").trim();
  const msg = `Hola, soy ${name}. Vengo del email del challenge y quiero saber más sobre cómo puedo entrar a Tu Primer Contrato en un plan de pagos.`;
  const base = MENTORIA_WHATSAPP ? `https://wa.me/${MENTORIA_WHATSAPP}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(msg)}`;
}

export async function sendMentoriaEmail(opts: {
  to: string;
  fullName: string;
  appUrl: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY no configurada" };

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [opts.to],
        subject: SUBJECT,
        html: buildHtml(opts.fullName, opts.appUrl),
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { ok: false, error: `Resend ${res.status}: ${txt.slice(0, 240)}` };
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "network_error" };
  }
}

/** Template HTML de marca (navy + botón verde WhatsApp + logo), table-based para clientes de email. */
function buildHtml(fullName: string, appUrl: string): string {
  const logo = `${appUrl}/halcon.png`;
  const waLink = buildWhatsAppLink(fullName);
  const firstName = (fullName || "").trim().split(/\s+/)[0] || "";
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0d1a3d;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0d1a3d;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
        <!-- Barra superior roja -->
        <tr><td style="height:4px;background:#E42D2C;line-height:4px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="padding:32px 32px 8px;text-align:center;">
          <img src="${logo}" alt="GovBidder Challenge" width="120" style="display:inline-block;height:auto;max-width:120px;" />
        </td></tr>
        <tr><td style="padding:8px 32px 0;text-align:center;">
          <p style="margin:0;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#E42D2C;">Programa · Tu Primer Contrato</p>
          <h1 style="margin:10px 0 0;font-size:22px;color:#0d1a3d;">¿Todavía estás pensando en unirte?</h1>
        </td></tr>
        <tr><td style="padding:14px 32px 0;text-align:center;">
          <p style="margin:0;font-size:15px;line-height:1.55;color:#475569;">
            ${firstName ? `${firstName}, si` : "Si"} todavía estás pensando en sumarte a la mentoría <strong>Tu Primer Contrato</strong>,
            este es el momento ideal. Tenemos una propuesta específica para vos, en cuotas, para que puedas arrancar sin pagar todo de una vez.
          </p>
        </td></tr>
        <tr><td style="padding:26px 32px 8px;text-align:center;">
          <a href="${waLink}" target="_blank"
             style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;padding:14px 32px;border-radius:10px;">
            💬 Comunicate ya mismo por WhatsApp
          </a>
        </td></tr>
        <tr><td style="padding:14px 32px 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">Enterate de la propuesta ahora mismo.</p>
        </td></tr>
        <tr><td style="padding:22px 32px 28px;text-align:center;border-top:1px solid #eef1f6;margin-top:16px;">
          <p style="margin:14px 0 0;font-size:11px;color:#94a3b8;">Si no esperabas este email, podés ignorarlo.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
