// Edge Function "order-authorize": il cliente AUTORIZZA il pagamento di un ordine
// di prodotto (capture_method: manual). I fondi vengono bloccati ma NON prelevati:
// l'addebito avviene quando l'azienda accetta (order-capture); se rifiuta, si
// rilascia l'autorizzazione (order-cancel). Destination charge verso l'account
// Connect del venditore, con application fee pari alla commissione del piano.
//
// Importo RICALCOLATO lato server (catalogo + piano): il client non è fonte di verità.
//
// SEGRETI: STRIPE_SECRET_KEY, SITE_URL
// Deploy: supabase functions deploy order-authorize

import Stripe from "npm:stripe@16.12.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { computeOrderAmount } from "../_shared/order-amount.ts";

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

    const { ordineId } = await req.json();

    const { data: o } = await admin
      .from("ordini")
      .select("id, owner, cliente_user_id, prodotto_id, quantita, stato")
      .eq("id", ordineId)
      .maybeSingle();

    if (!o) return json({ error: "Ordine non trovato" }, 404);
    if (o.cliente_user_id !== user.id) return json({ error: "Non autorizzato" }, 403);
    if (o.stato !== "richiesto") {
      return json({ error: "Ordine non in stato valido per il pagamento" }, 400);
    }

    // Importo autorevole dal DB (mai dal client)
    const amount = await computeOrderAmount(admin, o.prodotto_id, o.owner, o.quantita);
    if (amount.totaleCents <= 0) {
      return json({ error: "Importo dell'ordine non valido." }, 400);
    }
    await admin
      .from("ordini")
      .update({
        totale_cents: amount.totaleCents,
        commissione_cents: amount.commissioneCents,
        commissione_rate: amount.rate,
      })
      .eq("id", o.id);

    // account Connect del venditore
    const { data: acc } = await admin
      .from("stripe_accounts")
      .select("account_id, charges_enabled")
      .eq("user_id", o.owner)
      .maybeSingle();
    if (!acc?.account_id || !acc.charges_enabled) {
      return json({ error: "Il venditore non ha ancora attivato i pagamenti online." }, 400);
    }

    const { data: prod } = await admin
      .from("catalogo")
      .select("nome")
      .eq("id", o.prodotto_id)
      .maybeSingle();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: o.quantita,
          price_data: {
            currency: "eur",
            unit_amount: amount.unitCents,
            product_data: { name: prod?.nome ?? "Prodotto" },
          },
        },
      ],
      payment_intent_data: {
        // AUTORIZZA ora, ADDEBITA all'accettazione dell'azienda (manual capture)
        capture_method: "manual",
        application_fee_amount: amount.commissioneCents,
        transfer_data: { destination: acc.account_id },
      },
      metadata: { kind: "order", ordine_id: String(o.id) },
      success_url: `${SITE_URL}/ordini/?pagamento=autorizzato`,
      cancel_url: `${SITE_URL}/ordini/?pagamento=annullato`,
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
