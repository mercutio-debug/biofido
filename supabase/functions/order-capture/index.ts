// Edge Function "order-capture": l'AZIENDA accetta l'ordine → si ADDEBITA il
// pagamento autorizzato (cattura del PaymentIntent in manual capture). L'ordine
// passa a 'pagato'. Solo il venditore (owner) può catturare i propri ordini.
//
// SEGRETI: STRIPE_SECRET_KEY
// Deploy: supabase functions deploy order-capture

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
    if (!o.stripe_payment_intent) {
      return json({ error: "Pagamento non ancora autorizzato dal cliente" }, 400);
    }

    // Cattura l'autorizzazione: ora il denaro viene effettivamente prelevato.
    await stripe.paymentIntents.capture(o.stripe_payment_intent);

    await admin
      .from("ordini")
      .update({ stato: "pagato" })
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
