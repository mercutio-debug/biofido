// Edge Function "booking-cancel": l'AZIENDA rifiuta una prenotazione → si ANNULLA
// l'autorizzazione del pagamento (manual capture): i fondi bloccati vengono liberati,
// nessun addebito. La prenotazione passa a stato "rifiutata". Solo il proprietario
// (owner) può rifiutare le proprie prenotazioni.
//
// SEGRETI: STRIPE_SECRET_KEY, SITE_URL
// Deploy: supabase functions deploy booking-cancel --project-ref kvpxnxsjiyiixqksinzr

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
    if (!r.ok) console.error(`booking-cancel: Resend ${r.status}: ${await r.text()}`);
  } catch (e) {
    console.error("booking-cancel: email", (e as Error).message);
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
      .select("id, owner, stato, payment_status, stripe_payment_intent, cliente_user_id, cliente_email, cliente_nome, titolo")
      .eq("id", prenotazioneId)
      .maybeSingle();
    if (!p) return json({ error: "Prenotazione non trovata" }, 404);
    if (p.owner !== user.id) return json({ error: "Non autorizzato" }, 403);

    // se c'era un'autorizzazione attiva (fondi bloccati), la annullo → nessun addebito
    if (p.payment_status === "autorizzata" && p.stripe_payment_intent) {
      try {
        await stripe.paymentIntents.cancel(p.stripe_payment_intent);
      } catch (e) {
        // se è già stata catturata/scaduta non blocco il rifiuto della prenotazione
        console.error("booking-cancel: cancel PI", (e as Error).message);
      }
    }

    await admin
      .from("prenotazioni")
      .update({ stato: "rifiutata", payment_status: "non_pagata" })
      .eq("id", p.id);

    if (p.cliente_user_id) {
      await sendPush(p.cliente_user_id, {
        title: "Prenotazione non disponibile",
        body: `La tua prenotazione "${p.titolo ?? "esperienza"}" non è stata confermata. Nessun addebito: l'eventuale blocco fondi è stato liberato.`,
        url: SITE_URL ? `${SITE_URL}/prenotazioni/` : undefined,
      });
    }
    await sendEmail(
      (p as { cliente_email?: string | null }).cliente_email ?? null,
      "La tua prenotazione non è stata confermata",
      emailLayout({
        title: "Prenotazione non confermata",
        bodyHtml: `<p style="margin:0 0 12px;">Ciao ${esc((p as { cliente_nome?: string }).cliente_nome ?? "")},
          purtroppo l'azienda non ha potuto confermare la tua prenotazione:</p>
          <p style="margin:0 0 4px;"><strong>${esc(p.titolo ?? "Esperienza")}</strong></p>
          <p style="margin:12px 0 0;"><strong>Nessun addebito:</strong> l'eventuale blocco dei
          fondi è stato liberato. Puoi provare con un'altra data o un'altra azienda.</p>`,
        ctaLabel: SITE_URL ? "Trova un'altra esperienza" : undefined,
        ctaUrl: SITE_URL ? `${SITE_URL}/` : undefined,
      }),
    );

    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
