// Funzione SCHEDULATA (cron GIORNALIERO): ricorda all'azienda di APPROVARE le
// prenotazioni pagate ma ancora in attesa, prima che l'autorizzazione Stripe
// scada (~7 giorni → i fondi si liberano e si perde l'incasso).
//
// Cerca le prenotazioni con payment_status='autorizzata' + stato='in_attesa'
// create 5–6 giorni fa (finestra di ~1 giorno: un solo sollecito con cron daily)
// e avvisa l'azienda via email + push.
//
// SEGRETI: RESEND_API_KEY, NOTIFY_FROM, SITE_URL. Opzionale CRON_SECRET (se
// impostato, va passato nell'header "x-cron-secret" da pg_cron).
// Deploy con --no-verify-jwt (la chiama il cron, senza token utente):
//   supabase functions deploy solleciti-prenotazioni --no-verify-jwt --project-ref kvpxnxsjiyiixqksinzr

import { createClient } from "npm:@supabase/supabase-js@2";
import { emailLayout, esc } from "../_shared/email.ts";
import { sendPush } from "../_shared/push.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const NOTIFY_FROM = Deno.env.get("NOTIFY_FROM") ?? "BioFido <noreply@ecovisa.it>";
const CRON_SECRET = Deno.env.get("CRON_SECRET");
const SITE_URL = Deno.env.get("SITE_URL") ?? "";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function emailOf(userId: string): Promise<string | null> {
  try {
    const { data } = await admin.auth.admin.getUserById(userId);
    return data?.user?.email ?? null;
  } catch {
    return null;
  }
}

async function sendEmail(to: string | null, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY || !to) return;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: NOTIFY_FROM, to, subject, html }),
    });
    if (!r.ok) console.error(`solleciti-prenotazioni: Resend ${r.status}: ${await r.text()}`);
  } catch (e) {
    console.error("solleciti-prenotazioni: email", (e as Error).message);
  }
}

Deno.serve(async (req) => {
  // protezione opzionale: se CRON_SECRET è impostato, serve l'header giusto
  if (CRON_SECRET && req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response("forbidden", { status: 403 });
  }

  const ora = Date.now();
  const da = new Date(ora - 6 * 86_400_000).toISOString(); // 6 giorni fa
  const a = new Date(ora - 5 * 86_400_000).toISOString(); // 5 giorni fa

  const { data: prenotazioni } = await admin
    .from("prenotazioni")
    .select("id, owner, titolo, cliente_nome, totale_cents, created_at")
    .eq("payment_status", "autorizzata")
    .eq("stato", "in_attesa")
    .gte("created_at", da)
    .lt("created_at", a);

  const lista = (prenotazioni as
    | { id: string; owner: string; titolo: string | null; cliente_nome: string | null; totale_cents: number | null }[]
    | null) ?? [];

  let inviati = 0;
  for (const p of lista) {
    if (!p.owner) continue;
    const importo =
      p.totale_cents != null
        ? (Number(p.totale_cents) / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" })
        : null;

    // push all'azienda
    await sendPush(p.owner, {
      title: "⏳ Prenotazione da approvare entro poco",
      body: `"${p.titolo ?? "Esperienza"}" è pagata e in attesa: approva per incassare, l'autorizzazione sta per scadere.`,
      url: SITE_URL ? `${SITE_URL}/dashboard/` : undefined,
    });

    // email all'azienda
    const to = await emailOf(p.owner);
    await sendEmail(
      to,
      "⏳ Approva la prenotazione prima che scada l'autorizzazione",
      emailLayout({
        title: "Una prenotazione pagata aspetta la tua approvazione",
        bodyHtml: `<p style="margin:0 0 12px;">Hai una prenotazione <strong>già pagata</strong> (fondi
          bloccati) in attesa della tua approvazione:</p>
          <p style="margin:0 0 4px;"><strong>${esc(p.titolo ?? "Esperienza")}</strong></p>
          <p style="margin:0;">Cliente: ${esc(p.cliente_nome ?? "—")}${importo ? ` · ${esc(importo)}` : ""}</p>
          <p style="margin:12px 0 0;color:#a15c00;"><strong>Approvala a breve:</strong> l'autorizzazione
          del pagamento scade dopo circa 7 giorni. Se scade, i fondi del cliente si liberano e
          <strong>perdi l'incasso</strong> (dovrà riprenotare).</p>`,
        ctaLabel: SITE_URL ? "Vai ad approvare" : undefined,
        ctaUrl: SITE_URL ? `${SITE_URL}/dashboard/` : undefined,
        footerNote: "Approva o rifiuta dalla sezione «Prenotazioni ricevute» del cruscotto.",
      }),
    );
    inviati++;
  }

  return new Response(JSON.stringify({ ok: true, solleciti: inviati }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
