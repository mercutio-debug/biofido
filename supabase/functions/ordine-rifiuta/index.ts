// Edge Function "ordine-rifiuta": l'AZIENDA non accetta un ordine shop PAGATO
// (autorizzato) → ANNULLA l'autorizzazione (manual capture): i fondi bloccati
// vengono liberati, il cliente NON paga nulla. L'ordine passa a "rifiutato" con la
// MOTIVAZIONE scritta dall'azienda, che arriva al cliente via notifica ed email.
// Solo l'owner può rifiutare i propri ordini.
//
// SEGRETI: STRIPE_SECRET_KEY, SITE_URL, RESEND_API_KEY, NOTIFY_FROM
// Deploy: supabase functions deploy ordine-rifiuta --project-ref kvpxnxsjiyiixqksinzr

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
const NOTIFY_FROM = Deno.env.get("NOTIFY_FROM") ?? "ECO-VISA & BioFido <noreply@ecovisa.it>";
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
    if (!r.ok) console.error(`ordine-rifiuta: Resend ${r.status}: ${await r.text()}`);
  } catch (e) {
    console.error("ordine-rifiuta: email", (e as Error).message);
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

    const { ordineId, motivo } = await req.json();
    const motivazione = (typeof motivo === "string" ? motivo : "").trim();

    const { data: o } = await admin
      .from("ordini_shop")
      .select(
        "id, owner, stato, stripe_payment_intent, cliente_user_id, cliente_email, cliente_nome, azienda_nome",
      )
      .eq("id", ordineId)
      .maybeSingle();
    if (!o) return json({ error: "Ordine non trovato" }, 404);
    if (o.owner !== user.id) return json({ error: "Non autorizzato" }, 403);

    // se c'è un'autorizzazione attiva (fondi bloccati), la annullo → nessun addebito
    if (o.stripe_payment_intent) {
      try {
        await stripe.paymentIntents.cancel(o.stripe_payment_intent);
      } catch (e) {
        // se è già stata catturata/scaduta non blocco il rifiuto dell'ordine
        console.error("ordine-rifiuta: cancel PI", (e as Error).message);
      }
    }

    await admin
      .from("ordini_shop")
      .update({ stato: "rifiutato", nota: motivazione || null })
      .eq("id", o.id);

    // avviso il cliente con la motivazione dell'azienda
    const testoMotivo = motivazione
      ? `Motivo indicato dall'azienda: «${motivazione}».`
      : "L'azienda non ha potuto accettare l'ordine.";
    if (o.cliente_user_id) {
      await sendPush(o.cliente_user_id, {
        title: "Ordine non accettato — rimborso automatico",
        body: `${testoMotivo} Nessun addebito: il blocco fondi è stato liberato.`,
        url: SITE_URL ? `${SITE_URL}/ordini/` : undefined,
      });
    }
    await sendEmail(
      (o as { cliente_email?: string | null }).cliente_email ?? null,
      "Il tuo ordine non è stato accettato (nessun addebito)",
      emailLayout({
        title: "Ordine non accettato",
        bodyHtml: `<p style="margin:0 0 12px;">Ciao ${esc((o as { cliente_nome?: string }).cliente_nome ?? "")},
          purtroppo <strong>${esc(o.azienda_nome ?? "l'azienda")}</strong> non ha potuto accettare
          il tuo ordine.</p>
          <p style="margin:0 0 12px;padding:10px 12px;background:#f4f7ef;border-radius:10px;">
          ${esc(testoMotivo)}</p>
          <p style="margin:0;"><strong>Nessun addebito:</strong> il blocco dei fondi è stato
          liberato, non ti è stato addebitato nulla. Puoi provare con un altro produttore.</p>`,
        ctaLabel: SITE_URL ? "Torna allo shop" : undefined,
        ctaUrl: SITE_URL ? `${SITE_URL}/` : undefined,
      }),
    );

    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
