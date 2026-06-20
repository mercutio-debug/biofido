// Edge Function "booking-pay": il cliente paga una prenotazione CONFERMATA.
// Destination charge verso l'account Connect del produttore, con application
// fee pari alla commissione BioFido già registrata sulla prenotazione.
//
// SEGRETI: STRIPE_SECRET_KEY, SITE_URL
// Deploy: supabase functions deploy booking-pay

import Stripe from "npm:stripe@16.12.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});
const SITE_URL = Deno.env.get("SITE_URL") ?? "";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // identifica il cliente dall'access-token
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
      .select("id, owner, cliente_user_id, stato, payment_status, totale_cents, commissione_cents, titolo, esperienze(titolo)")
      .eq("id", prenotazioneId)
      .maybeSingle();

    if (!p) return json({ error: "Prenotazione non trovata" }, 404);
    if (p.cliente_user_id !== user.id) return json({ error: "Non autorizzato" }, 403);
    if (p.stato !== "confermata") return json({ error: "La prenotazione non è ancora confermata" }, 400);
    if (p.payment_status === "pagata") return json({ error: "Prenotazione già pagata" }, 400);

    // account del produttore
    const { data: acc } = await admin
      .from("stripe_accounts")
      .select("account_id, charges_enabled")
      .eq("user_id", p.owner)
      .maybeSingle();
    if (!acc?.account_id || !acc.charges_enabled) {
      return json({ error: "Il produttore non ha ancora attivato i pagamenti online." }, 400);
    }

    const titolo =
      (p as { titolo?: string | null }).titolo ||
      (p as { esperienze?: { titolo?: string } }).esperienze?.titolo ||
      "Servizio";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: p.totale_cents,
            product_data: { name: titolo },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: p.commissione_cents,
        transfer_data: { destination: acc.account_id },
      },
      metadata: { kind: "booking", prenotazione_id: String(p.id) },
      success_url: `${SITE_URL}/prenotazioni/?pagamento=ok`,
      cancel_url: `${SITE_URL}/prenotazioni/?pagamento=annullato`,
    });

    return json({ url: session.url });
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
