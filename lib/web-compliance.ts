/**
 * Bloques de cumplimiento que se agregan a TODAS las webs del Día 3.
 *
 * Por qué existe: para aprobar un número 800 / toll-free (y el registro A2P en
 * GoHighLevel), el verificador revisa el sitio y exige:
 *   1. Un formulario donde la persona deja su teléfono y acepta recibir SMS,
 *      con checkboxes de consentimiento NO premarcados y NO obligatorios.
 *   2. Texto de consentimiento con: nombre de la empresa, frecuencia, "Msg &
 *      data rates may apply", cómo darse de baja (STOP) y pedir ayuda (HELP).
 *   3. Privacy Policy y Terms of Service visibles y enlazados desde el
 *      formulario, con la cláusula de que el consentimiento SMS no se comparte.
 *
 * Antes la IA generaba la web sin nada de esto y los alumnos no podían aprobar
 * su número. Ahora se inyecta por código (no depende de que la IA lo escriba),
 * así también corrige las webs ya generadas sin regenerarlas.
 *
 * El formulario queda "de muestra": no envía datos a ningún lado. Cuando el
 * alumno conecte su formulario real de GoHighLevel, reemplaza el bloque
 * marcado con GOVBIDDER-FORM-START / GOVBIDDER-FORM-END.
 *
 * El contenido va en INGLÉS porque el sitio es para clientes en EE. UU.
 */

export interface ComplianceInfo {
  companyName: string;
  niche?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  usState?: string | null;
  website?: string | null;
}

/** Marca que indica que el HTML ya tiene los bloques (evita duplicarlos). */
const MARKER = "GOVBIDDER-COMPLIANCE";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function clean(value?: string | null): string {
  return (value ?? "").trim();
}

function formSection(info: ComplianceInfo): string {
  const company = esc(clean(info.companyName) || "Our Company");
  const phone = clean(info.phone);
  const email = clean(info.email);

  const contactLine = [
    phone ? `<a href="tel:${esc(phone.replace(/[^\d+]/g, ""))}">${esc(phone)}</a>` : "",
    email ? `<a href="mailto:${esc(email)}">${esc(email)}</a>` : "",
  ].filter(Boolean).join(" &middot; ");

  return `
<!-- GOVBIDDER-FORM-START: formulario de muestra. Reemplazar por el formulario real de GoHighLevel conservando los dos checkboxes y el texto de consentimiento. -->
<section class="gbc-contact" id="contact-form">
  <div class="gbc-wrap">
    <div class="gbc-intro">
      <p class="gbc-eyebrow">Get in touch</p>
      <h2>Request a Free Quote</h2>
      <p>Tell us what you need and the ${company} team will get back to you shortly.</p>
      ${contactLine ? `<p class="gbc-direct">${contactLine}</p>` : ""}
    </div>
    <form class="gbc-form" action="#contact-form" method="post">
      <div class="gbc-row">
        <label>First name<input type="text" name="first_name" autocomplete="given-name" required></label>
        <label>Last name<input type="text" name="last_name" autocomplete="family-name" required></label>
      </div>
      <label>Email<input type="email" name="email" autocomplete="email" required></label>
      <label>Phone<input type="tel" name="phone" autocomplete="tel"></label>
      <label>How can we help?<textarea name="message" rows="4"></textarea></label>

      <label class="gbc-check">
        <input type="checkbox" name="sms_consent_transactional" value="yes">
        <span>By checking this box, I consent to receive transactional messages related to my account, orders or services I have requested from ${company}. These messages may include appointment reminders, order confirmations and account notifications, among others. Message frequency may vary. Message &amp; data rates may apply. Reply HELP for help or STOP to opt out.</span>
      </label>
      <label class="gbc-check">
        <input type="checkbox" name="sms_consent_marketing" value="yes">
        <span>By checking this box, I consent to receive marketing and promotional messages, including special offers, discounts and new product updates, from ${company}. Message frequency may vary. Message &amp; data rates may apply. Reply HELP for help or STOP to opt out.</span>
      </label>

      <p class="gbc-fine">Consent to receive text messages is not a condition of purchase. No mobile information will be shared with third parties or affiliates for marketing or promotional purposes. See our <a href="#privacy-policy">Privacy Policy</a> and <a href="#terms-of-service">Terms of Service</a>.</p>

      <button type="submit" class="gbc-submit">Send Request</button>
    </form>
  </div>
</section>
<!-- GOVBIDDER-FORM-END -->`;
}

function legalSections(info: ComplianceInfo): string {
  const company = esc(clean(info.companyName) || "Our Company");
  const niche = clean(info.niche);
  const phone = clean(info.phone);
  const email = clean(info.email);
  const address = [clean(info.address), clean(info.usState)].filter(Boolean).join(", ");
  const website = clean(info.website);
  const year = new Date().getFullYear();
  const updated = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const contactItems = [
    email ? `<li>Email: <a href="mailto:${esc(email)}">${esc(email)}</a></li>` : "",
    phone ? `<li>Phone: ${esc(phone)}</li>` : "",
    address ? `<li>Address: ${esc(address)}</li>` : "",
    website ? `<li>Website: ${esc(website)}</li>` : "",
  ].filter(Boolean).join("");
  const contactBlock = contactItems
    ? `<ul>${contactItems}</ul>`
    : `<p>Please use the contact form on this website.</p>`;

  const services = niche ? esc(niche) : "our products and services";
  const helpContact = email || phone ? ` or contact us at ${esc(email || phone)}` : "";

  return `
<section class="gbc-legal" id="privacy-policy">
  <div class="gbc-wrap gbc-doc">
    <a class="gbc-close" href="#">&larr; Back to site</a>
    <h2>Privacy Policy</h2>
    <p class="gbc-updated">Last updated: ${updated}</p>
    <p>${company} ("we", "us" or "our") respects your privacy. This Privacy Policy explains how we collect, use and protect the information you provide when you visit our website or contact us about ${services}.</p>
    <h3>Information we collect</h3>
    <p>We collect the information you voluntarily submit through our forms, such as your name, email address, phone number and the details of your request. We may also collect basic technical data (browser type, pages visited) to improve our website.</p>
    <h3>How we use your information</h3>
    <ul>
      <li>To respond to your inquiries and provide quotes or services you request.</li>
      <li>To send you transactional messages about your requests, appointments or account.</li>
      <li>To send you marketing messages, only if you gave us your express consent.</li>
      <li>To improve our services and comply with legal obligations.</li>
    </ul>
    <h3>SMS / text messaging</h3>
    <p>If you opt in to receive text messages, we will use your mobile number only to send the messages you agreed to. You can opt out at any time by replying STOP, and reply HELP for assistance. Message frequency may vary. Message and data rates may apply.</p>
    <p><strong>No mobile information will be shared with third parties or affiliates for marketing or promotional purposes. Text messaging originator opt-in data and consent will not be shared with any third parties.</strong> Information sharing with subcontractors in support services, such as customer service or message delivery providers, is permitted only to operate the messaging program.</p>
    <h3>Sharing of information</h3>
    <p>We do not sell or rent your personal information. We may share it only with service providers who help us operate our business, under confidentiality obligations, or when required by law.</p>
    <h3>Data security and retention</h3>
    <p>We use reasonable administrative and technical measures to protect your information and keep it only as long as needed for the purposes described here or as required by law.</p>
    <h3>Your rights</h3>
    <p>You may request access to, correction of, or deletion of your personal information at any time by contacting us.</p>
    <h3>Contact us</h3>
    ${contactBlock}
  </div>
</section>

<section class="gbc-legal" id="terms-of-service">
  <div class="gbc-wrap gbc-doc">
    <a class="gbc-close" href="#">&larr; Back to site</a>
    <h2>Terms of Service</h2>
    <p class="gbc-updated">Last updated: ${updated}</p>
    <p>By using this website or requesting ${services} from ${company}, you agree to these Terms of Service.</p>
    <h3>Use of this website</h3>
    <p>The content of this website is provided for general information. You agree to use it lawfully and not to interfere with its operation. Quotes and descriptions are not binding until confirmed in writing by ${company}.</p>
    <h3>SMS messaging program</h3>
    <ul>
      <li><strong>Program:</strong> ${company} customer notifications and, if you opt in separately, marketing messages.</li>
      <li><strong>Description:</strong> transactional messages (appointment reminders, order and service updates, account notifications) and, with your separate consent, promotional offers.</li>
      <li><strong>Opt-in:</strong> you join by checking the consent box on our contact form. Consent is not a condition of purchase.</li>
      <li><strong>Frequency:</strong> message frequency varies based on your interactions with us.</li>
      <li><strong>Cost:</strong> message and data rates may apply according to your mobile plan.</li>
      <li><strong>Opt-out:</strong> reply STOP at any time to cancel. You will receive one final message confirming your opt-out.</li>
      <li><strong>Help:</strong> reply HELP for assistance${helpContact}.</li>
      <li>Carriers are not liable for delayed or undelivered messages.</li>
    </ul>
    <p>See our <a href="#privacy-policy">Privacy Policy</a> for how we handle your information.</p>
    <h3>Limitation of liability</h3>
    <p>To the extent permitted by law, ${company} is not liable for indirect or consequential damages arising from the use of this website.</p>
    <h3>Changes</h3>
    <p>We may update these terms from time to time. The updated version will be posted on this page.</p>
    <h3>Contact us</h3>
    ${contactBlock}
  </div>
</section>

<div class="gbc-legalbar">
  <div class="gbc-wrap">
    <span>&copy; ${year} ${company}. All rights reserved.</span>
    <nav><a href="#privacy-policy">Privacy Policy</a><a href="#terms-of-service">Terms of Service</a><a href="#contact-form">Contact</a></nav>
  </div>
</div>`;
}

const COMPLIANCE_CSS = `
/* ${MARKER} */
.gbc-contact,.gbc-legal,.gbc-legalbar{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;box-sizing:border-box;}
.gbc-contact *,.gbc-legal *,.gbc-legalbar *{box-sizing:border-box;}
.gbc-wrap{max-width:1180px;margin:0 auto;padding:0 24px;}
.gbc-contact{padding:96px 0;background:#f5f6f8;color:#1a1d24;}
.gbc-contact .gbc-wrap{display:grid;grid-template-columns:1fr 1.2fr;gap:56px;align-items:start;}
.gbc-eyebrow{text-transform:uppercase;letter-spacing:2px;font-size:13px;font-weight:700;opacity:.65;margin:0 0 10px;}
.gbc-intro h2{font-size:36px;line-height:1.15;margin:0 0 16px;font-weight:800;}
.gbc-intro p{font-size:17px;line-height:1.7;margin:0 0 12px;}
.gbc-direct a{color:inherit;font-weight:600;}
.gbc-form{background:#fff;border-radius:18px;padding:32px;box-shadow:0 10px 40px rgba(16,24,40,.08);display:flex;flex-direction:column;gap:16px;}
.gbc-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.gbc-form label{display:flex;flex-direction:column;gap:6px;font-size:14px;font-weight:600;}
.gbc-form input[type=text],.gbc-form input[type=email],.gbc-form input[type=tel],.gbc-form textarea{width:100%;border:1px solid #d5d9e0;border-radius:10px;padding:12px 14px;font:inherit;font-weight:400;font-size:15px;background:#fff;color:#1a1d24;}
.gbc-form .gbc-check{flex-direction:row;align-items:flex-start;gap:10px;font-weight:400;font-size:13px;line-height:1.55;color:#3d4350;}
.gbc-check input{margin-top:3px;width:16px;height:16px;flex:0 0 16px;}
.gbc-fine{font-size:12px;line-height:1.6;color:#5b6270;margin:0;}
.gbc-fine a,.gbc-doc a{color:inherit;text-decoration:underline;}
.gbc-submit{border:0;border-radius:999px;padding:14px 28px;font:inherit;font-weight:700;font-size:16px;background:#1a1d24;color:#fff;cursor:pointer;align-self:flex-start;}
.gbc-legal{display:none;padding:72px 0;background:#fff;color:#1a1d24;}
.gbc-legal:target{display:block;}
.gbc-doc{max-width:820px;}
.gbc-doc h2{font-size:34px;margin:16px 0 4px;font-weight:800;}
.gbc-doc h3{font-size:19px;margin:28px 0 8px;}
.gbc-doc p,.gbc-doc li{font-size:15px;line-height:1.75;}
.gbc-updated{opacity:.6;font-size:13px!important;}
.gbc-close{font-size:14px;font-weight:600;}
.gbc-legalbar{background:#0f1115;color:#c9ced8;padding:18px 0;font-size:13px;}
.gbc-legalbar .gbc-wrap{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;}
.gbc-legalbar nav{display:flex;gap:20px;flex-wrap:wrap;}
.gbc-legalbar a{color:#fff;text-decoration:none;}
@media (max-width:768px){
  .gbc-contact{padding:64px 0;}
  .gbc-contact .gbc-wrap{grid-template-columns:1fr;gap:28px;}
  .gbc-row{grid-template-columns:1fr;}
  .gbc-form{padding:22px;}
  .gbc-intro h2{font-size:28px;}
}`;

/**
 * Devuelve el HTML/CSS de la web con el formulario de consentimiento SMS, la
 * Privacy Policy, los Terms of Service y la barra legal agregados.
 * Es idempotente: si el HTML ya los tiene, lo devuelve sin cambios.
 */
export function withCompliance(
  html: string,
  css: string,
  info: ComplianceInfo,
): { html: string; css: string } {
  if (!html) return { html, css };
  if (html.includes("GOVBIDDER-FORM-START") || css.includes(MARKER)) return { html, css };

  const form = formSection(info);
  const legal = legalSections(info);

  // El formulario va antes del footer de la IA (si lo hay); si no, al final.
  const footerIdx = html.search(/<footer[\s>]/i);
  const withForm = footerIdx >= 0
    ? html.slice(0, footerIdx) + form + "\n" + html.slice(footerIdx)
    : html + form;

  return { html: withForm + legal, css: `${css}\n${COMPLIANCE_CSS}` };
}

/** Documento HTML completo listo para descargar/abrir, ya con cumplimiento. */
export function buildWebDocument(html: string, css: string, info: ComplianceInfo): string {
  const out = withCompliance(html, css, info);
  const title = esc(clean(info.companyName) || "My Company");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>${out.css}</style>
</head>
<body>
${out.html}
</body>
</html>`;
}
