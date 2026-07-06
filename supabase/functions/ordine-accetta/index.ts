// Edge Function "ordine-accetta": l'AZIENDA accetta un ordine shop PAGATO
// (autorizzato, fondi bloccati) → CATTURA il pagamento (manual capture): i fondi
// vengono incassati (destination charge verso l'azienda, meno la commissione del
// piano). L'ordine passa a "confermato" e il cliente viene avvisato. Solo l'owner
// può accettare i propri ordini.
//
// SEGRETI: STRIPE_SECRET_KEY, SITE_URL, RESEND_API_KEY, NOTIFY_FROM
// Deploy: supabase functions deploy ordine-accetta --project-ref kvpxnxsjiyiixqksinzr

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
    if (!r.ok) console.error(`ordine-accetta: Resend ${r.status}: ${await r.text()}`);
  } catch (e) {
    console.error("ordine-accetta: email", (e as Error).message);
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

    const { ordineId } = await req.json();

    const { data: o } = await admin
      .from("ordini_shop")
      .select(
        "id, owner, stato, stripe_payment_intent, cliente_user_id, cliente_email, cliente_nome, azienda_nome",
      )
      .eq("id", ordineId)
      .maybeSingle();
    if (!o) return json({ error: "Ordine non trovato" }, 404);
    if (o.owner !== user.id) return json({ error: "Non autorizzato" }, 403);
    if (o.stato !== "autorizzato") {
      return json({ error: "Questo ordine non è in attesa di conferma." }, 400);
    }
    if (!o.stripe_payment_intent) {
      return json({ error: "Pagamento non trovato per questo ordine." }, 400);
    }

    // CATTURA: incasso i fondi bloccati (vanno all'azienda meno la commissione)
    try {
      await stripe.paymentIntents.capture(o.stripe_payment_intent);
    } catch (e) {
      return json({ error: "Impossibile incassare il pagamento: " + (e as Error).message }, 400);
    }

    await admin.from("ordini_shop").update({ stato: "confermato" }).eq("id", o.id);

    // avviso il cliente: ordine confermato, l'azienda prepara la spedizione
    if (o.cliente_user_id) {
      await sendPush(o.cliente_user_id, {
        title: "✅ Ordine confermato",
        body: `${o.azienda_nome ?? "L'azienda"} ha confermato il tuo ordine e sta preparando la spedizione.`,
        url: SITE_URL ? `${SITE_URL}/ordini/` : undefined,
      });
    }
    await sendEmail(
      (o as { cliente_email?: string | null }).cliente_email ?? null,
      "Il tuo ordine è stato confermato 🎉",
      emailLayout({
        title: "Ordine confermato!",
        bodyHtml: `<p style="margin:0 0 12px;">Ciao ${esc((o as { cliente_nome?: string }).cliente_nome ?? "")},
          <strong>${esc(o.azienda_nome ?? "l'azienda")}</strong> ha confermato il tuo ordine e sta
          preparando la spedizione.</p>
          <p style="margin:0;">Ti avviseremo appena il pacco parte. Grazie per aver scelto un
          piccolo produttore! 🌱</p>`,
        ctaLabel: SITE_URL ? "Vedi i tuoi ordini" : undefined,
        ctaUrl: SITE_URL ? `${SITE_URL}/ordini/` : undefined,
      }),
    );

    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
