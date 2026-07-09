// Template grafico condiviso per le email transazionali (Resend), in linea col
// mood dei portali ECO-VISA / BioFido: verde + lime, card arrotondata, intestazione
// con marchio e pulsante d'azione. HTML "email-safe" (stili inline, layout a
// tabella) per la massima compatibilità con i client di posta.

/** Escape dei testi dinamici (nome cliente, messaggi…) per evitare HTML rotto/iniettato. */
export function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Va a capo: trasforma i ritorni a capo del testo in <br> (dopo l'escape). */
export function nl2br(s: string): string {
  return s.replace(/\r?\n/g, "<br/>");
}

export type EmailOptions = {
  /** titolo grande dentro la card */
  title: string;
  /** corpo principale: HTML già pronto (usa esc()/nl2br() sui testi dinamici) */
  bodyHtml: string;
  /** testo dell'eventuale pulsante d'azione */
  ctaLabel?: string;
  /** link dell'eventuale pulsante d'azione */
  ctaUrl?: string;
  /** nota piccola sotto al pulsante */
  footerNote?: string;
  /** marchio mostrato nell'intestazione (default: i due portali) */
  brand?: string;
  /** dominio mostrato nel footer */
  site?: string;
};

const GREEN = "#1c5132";
const GREEN_TXT = "#1f3d2b";
const LIME = "#8cc63f";
const MUTED = "#6b7c70";
const LEAF = "#eef4e6";
const BORDER = "#e3eed7";

/** Costruisce l'HTML completo di una email di notifica brandizzata. */
export function emailLayout(opts: EmailOptions): string {
  const brand = opts.brand ?? "ECO-VISA · BioFido";
  const site = opts.site ?? "ecovisa.it";
  const cta =
    opts.ctaUrl && opts.ctaLabel
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 4px;">
           <tr><td style="border-radius:999px;background:${GREEN};">
             <a href="${opts.ctaUrl}" target="_blank"
                style="display:inline-block;padding:13px 28px;font-family:Arial,Helvetica,sans-serif;
                       font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px;">
               ${esc(opts.ctaLabel)} &nbsp;&rarr;
             </a>
           </td></tr>
         </table>`
      : "";
  const note = opts.footerNote
    ? `<p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${MUTED};">${opts.footerNote}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="it"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(opts.title)}</title></head>
<body style="margin:0;padding:0;background:${LEAF};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${LEAF};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0"
             style="width:600px;max-width:100%;background:#ffffff;border:1px solid ${BORDER};border-radius:18px;overflow:hidden;">
        <!-- intestazione -->
        <tr><td style="background:${GREEN};padding:16px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:bold;color:#ffffff;letter-spacing:.3px;">
              🌱 ${esc(brand)}
            </td>
            <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${LIME};text-transform:uppercase;letter-spacing:1px;">
              Notifica
            </td>
          </tr></table>
        </td></tr>
        <!-- corpo -->
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.3;color:${GREEN_TXT};">
            ${esc(opts.title)}
          </h1>
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${GREEN_TXT};">
            ${opts.bodyHtml}
          </div>
          ${cta}
          ${note}
        </td></tr>
        <!-- footer -->
        <tr><td style="border-top:1px solid ${BORDER};padding:16px 28px;background:#fbfdf7;">
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${MUTED};">
            Ricevi questa email perché hai un profilo su <strong>${esc(brand)}</strong>.<br/>
            🌱 <a href="https://${esc(site)}" target="_blank" style="color:${GREEN};text-decoration:none;font-weight:bold;">${esc(site)}</a>
          </p>
        </td></tr>
      </table>
      <p style="margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${MUTED};">
        Impronta di trasporto delle materie prime · filiera corta e biologica
      </p>
    </td></tr>
  </table>
</body></html>`;
}
