// Edge Function "booking-capture": l'AZIENDA approva una prenotazione → si CATTURA
// il pagamento autorizzato (manual capture): i fondi bloccati vengono addebitati.
// La prenotazione passa a stato "confermata" + payment_status "pagata". Solo il
// proprietario (owner) può catturare le proprie prenotazioni.
//
// SEGRETI: STRIPE_SECRET_KEY, SITE_URL
// Deploy: supabase functions deploy booking-capture --project-ref kvpxnxsjiyiixqksinzr

import Stripe from "npm:stripe@16.12.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { sendPush } from "../_shared/push.ts";
import { emailLayout, esc } from "../_shared/email.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});
const SITE_URL = Deno.env.get("SITE_URL") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const NOTIFY_FROM = Deno.env.get("NOTIFY_FROM") ?? "BioFido <noreply@ecovisa.it>";
const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sendEmail(to: string | null, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY || !to) return;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: NOTIFY_FROM, to, subject, html }),
    });
    if (!r.ok) console.error(`booking-capture: Resend ${r.status}: ${await r.text()}`);
  } catch (e) {
    console.error("booking-capture: email", (e as Error).message);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return json({ error: "Non autenticato" }, 401);

    const { prenotazioneId } = await req.json();

    const { data: p } = await admin
      .from("prenotazioni")
      .select("id, owner, stato, payment_status, stripe_payment_intent, cliente_user_id, cliente_email, cliente_nome, titolo, data_richiesta, orario_richiesto, totale_cents")
      .eq("id", prenotazioneId)
      .maybeSingle();
    if (!p) return json({ error: "Prenotazione non trovata" }, 404);
    if (p.owner !== user.id) return json({ error: "Non autorizzato" }, 403);
    if (p.payment_status !== "autorizzata" || !p.stripe_payment_intent) {
      return json({ error: "Pagamento non ancora autorizzato dal cliente" }, 400);
    }

    // Cattura l'autorizzazione: i fondi bloccati vengono ora addebitati.
    await stripe.paymentIntents.capture(p.stripe_payment_intent);

    await admin
      .from("prenotazioni")
      .update({ stato: "confermata", payment_status: "pagata" })
      .eq("id", p.id);

    // avvisa il cliente (push + email) che la prenotazione è confermata e pagata
    if (p.cliente_user_id) {
      await sendPush(p.cliente_user_id, {
        title: "✅ Prenotazione confermata",
        body: `La tua prenotazione "${p.titolo ?? "esperienza"}" è stata approvata: il pagamento è ora completato.`,
        url: SITE_URL ? `${SITE_URL}/prenotazioni/` : undefined,
      });
    }
    const importo =
      p.totale_cents != null
        ? (Number(p.totale_cents) / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" })
        : null;
    await sendEmail(
      (p as { cliente_email?: string | null }).cliente_email ?? null,
      "✅ La tua prenotazione è confermata",
      emailLayout({
        title: "Prenotazione confermata ✅",
        bodyHtml: `<p style="margin:0 0 12px;">Ciao ${esc((p as { cliente_nome?: string }).cliente_nome ?? "")},
          l'azienda ha <strong>approvato</strong> la tua prenotazione:</p>
          <p style="margin:0 0 4px;"><strong>${esc(p.titolo ?? "Esperienza")}</strong></p>
          <p style="margin:0;">Data richiesta: ${esc(p.data_richiesta ?? "—")}${
            (p as { orario_richiesto?: string | null }).orario_richiesto
              ? ` · ore ${esc((p as { orario_richiesto?: string }).orario_richiesto)}`
              : ""
          }</p>
          ${importo ? `<p style="margin:10px 0 0;"><strong>Pagamento completato:</strong> ${esc(importo)}</p>` : ""}
          <p style="margin:12px 0 0;">A presto!</p>`,
        ctaLabel: SITE_URL ? "Le mie prenotazioni" : undefined,
        ctaUrl: SITE_URL ? `${SITE_URL}/prenotazioni/` : undefined,
      }),
    );

    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
