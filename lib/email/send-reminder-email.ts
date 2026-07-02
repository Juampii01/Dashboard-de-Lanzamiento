/**
 * Emails de recordatorio segmentados (no ingresó / no completó Día 1).
 *
 * Remitente y asunto DISTINTOS al email de acceso original (send-access-email.ts)
 * a propósito, para que Gmail no los agrupe en el mismo hilo.
 *
 * Requiere RESEND_API_KEY (en Vercel). Mismo dominio verificado que el resto
 * (send.govbidder.net), dirección nueva.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM = "GovBidder Challenge <recordatorio@send.govbidder.net>";

export type ReminderSegment = "never_accessed" | "day1_incomplete";

const SUBJECTS: Record<ReminderSegment, string> = {
  never_accessed: "Todavía no ingresaste al GovBidder Challenge",
  day1_incomplete: "Te falta completar el Día 1 del Challenge",
};

export async function sendReminderEmail(opts: {
  to: string;
  segment: ReminderSegment;
  magicLink: string;
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
        subject: SUBJECTS[opts.segment],
        html: buildHtml(opts.segment, opts.magicLink, opts.appUrl),
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

const COPY: Record<ReminderSegment, { kicker: string; title: string; body: string; cta: string }> = {
  never_accessed: {
    kicker: "GovBidder Challenge",
    title: "Todavía no ingresaste al dashboard",
    body: "Vimos que todavía no entraste al GovBidder Challenge. Tu cuenta ya está lista — hacé clic en el botón para entrar y arrancar.",
    cta: "Entrar al dashboard →",
  },
  day1_incomplete: {
    kicker: "GovBidder Challenge",
    title: "Te falta completar el Día 1",
    body: "Vimos que ya entraste al dashboard, pero todavía no completaste el Día 1. Hacé clic en el botón para entrar y terminarlo.",
    cta: "Completar el Día 1 →",
  },
};

/** Template HTML de marca (navy + botón rojo + logo), table-based para clientes de email. */
function buildHtml(segment: ReminderSegment, magicLink: string, appUrl: string): string {
  const logo = `${appUrl}/halcon.png`;
  const c = COPY[segment];
  const loginUrl = `${appUrl}/login`;
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
          <p style="margin:0;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#E42D2C;">${c.kicker}</p>
          <h1 style="margin:10px 0 0;font-size:22px;color:#0d1a3d;">${c.title}</h1>
        </td></tr>
        <tr><td style="padding:14px 32px 0;text-align:center;">
          <p style="margin:0;font-size:15px;line-height:1.55;color:#475569;">${c.body}</p>
        </td></tr>
        <tr><td style="padding:26px 32px 8px;text-align:center;">
          <a href="${magicLink}" target="_blank"
             style="display:inline-block;background:#E42D2C;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;padding:14px 32px;border-radius:10px;">
            ${c.cta}
          </a>
        </td></tr>
        <tr><td style="padding:18px 32px 6px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">Si el botón no funciona, copiá y pegá este enlace en tu navegador:</p>
          <p style="margin:6px 0 0;font-size:12px;word-break:break-all;"><a href="${magicLink}" style="color:#152978;">${magicLink}</a></p>
        </td></tr>
        <tr><td style="padding:14px 32px 6px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">Este enlace es de un solo uso y expira por seguridad. Si ya pasó un rato y no funciona, entrá a <a href="${loginUrl}" style="color:#152978;">${loginUrl.replace(/^https?:\/\//, "")}</a> e ingresá tu email para recibir uno nuevo.</p>
        </td></tr>
        <tr><td style="padding:22px 32px 28px;text-align:center;border-top:1px solid #eef1f6;margin-top:16px;">
          <p style="margin:14px 0 0;font-size:11px;color:#94a3b8;">Si no esperabas este email, podés ignorarlo.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
