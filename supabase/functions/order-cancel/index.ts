// Edge Function "order-cancel": l'AZIENDA rifiuta l'ordine → si ANNULLA
// l'autorizzazione (cancel del PaymentIntent): i fondi bloccati sul cliente
// vengono rilasciati, nessun addebito. L'ordine passa a 'rifiutato'.
// Solo il venditore (owner) può rifiutare i propri ordini.
//
// SEGRETI: STRIPE_SECRET_KEY
// Deploy: supabase functions deploy order-cancel

import Stripe from "npm:stripe@16.12.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});
const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

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
      .from("ordini")
      .select("id, owner, stato, stripe_payment_intent")
      .eq("id", ordineId)
      .maybeSingle();
    if (!o) return json({ error: "Ordine non trovato" }, 404);
    if (o.owner !== user.id) return json({ error: "Non autorizzato" }, 403);
    if (o.stato !== "richiesto") {
      return json({ error: "Ordine non in attesa di accettazione" }, 400);
    }

    // Rilascia l'autorizzazione (se presente): nessun addebito al cliente.
    if (o.stripe_payment_intent) {
      try {
        await stripe.paymentIntents.cancel(o.stripe_payment_intent);
      } catch (e) {
        // se era già annullato/scaduto si prosegue comunque a segnare 'rifiutato'
        console.error("order-cancel: cancel PI fallita:", (e as Error).message);
      }
    }

    await admin
      .from("ordini")
      .update({ stato: "rifiutato" })
      .eq("id", o.id);

    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
