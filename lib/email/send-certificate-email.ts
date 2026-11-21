/**
 * Email con el certificado adjunto en PDF, al reclamarlo desde la app.
 */
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM = "Tu Primer Contrato Challenge <acceso@send.govbidder.net>";
const LOGO = "https://dboard.govbidder.net/tpc-logo.png";

export async function sendCertificateEmail(opts: {
  to: string; name: string; certificateNumber: string; verifyUrl: string; pdfBase64: string; filename: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY no configurada" };
  const first = escapeHtml(opts.name.trim().split(" ")[0] || "");
  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0d1a3d;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0d1a3d;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
        <tr><td style="height:4px;background:#D4A017;line-height:4px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="padding:32px 32px 8px;text-align:center;">
          <img src="${LOGO}" alt="Tu Primer Contrato Challenge" width="110" style="display:inline-block;height:auto;max-width:110px;" />
        </td></tr>
        <tr><td style="padding:8px 32px 0;text-align:center;">
          <p style="margin:0;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#B8860B;">Certificado de finalización</p>
          <h1 style="margin:10px 0 0;font-size:22px;color:#0d1a3d;">¡Felicitaciones${first ? `, ${first}` : ""}!</h1>
        </td></tr>
        <tr><td style="padding:14px 32px 0;text-align:center;">
          <p style="margin:0;font-size:15px;line-height:1.55;color:#475569;">
            Completaste el Tu Primer Contrato Challenge. Te adjuntamos tu certificado en PDF.
            Su número es <strong>${escapeHtml(opts.certificateNumber)}</strong> y cualquiera puede verificarlo en línea.
          </p>
        </td></tr>
        <tr><td style="padding:26px 32px 8px;text-align:center;">
          <a href="${opts.verifyUrl}" target="_blank"
             style="display:inline-block;background:#152978;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;padding:14px 32px;border-radius:10px;">
            Ver mi certificado verificado →
          </a>
        </td></tr>
        <tr><td style="padding:18px 32px 30px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">También puedes descargarlo cuando quieras desde la pestaña “Certificado” del dashboard.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  try {
    const r = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [opts.to],
        subject: "Tu certificado del Tu Primer Contrato Challenge",
        html,
        attachments: [{ filename: opts.filename, content: opts.pdfBase64 }],
      }),
    });
    if (!r.ok) return { ok: false, error: `Resend ${r.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
