// Edge Function "booking-pay": il cliente AUTORIZZA il pagamento di una
// prenotazione (manual capture: i fondi vengono bloccati, non addebitati). L'addebito
// vero avviene solo quando l'azienda APPROVA (booking-capture); se rifiuta, l'auto-
// rizzazione si annulla (booking-cancel). Destination charge verso l'account Connect
// del produttore, con application fee pari alla commissione già registrata.
//
// SEGRETI: STRIPE_SECRET_KEY, SITE_URL
// Deploy: supabase functions deploy booking-pay

import Stripe from "npm:stripe@16.12.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { computeBookingAmount } from "../_shared/booking-amount.ts";

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
      .select("id, owner, cliente_user_id, stato, payment_status, persone, esperienza_id, prodotto_id, voce_id, totale_cents, commissione_cents, titolo, esperienze(titolo)")
      .eq("id", prenotazioneId)
      .maybeSingle();

    if (!p) return json({ error: "Prenotazione non trovata" }, 404);
    if (p.cliente_user_id !== user.id) return json({ error: "Non autorizzato" }, 403);
    // si paga (autorizza) una prenotazione ancora in attesa: non dev'essere già
    // autorizzata/pagata, né rifiutata/annullata dall'azienda.
    if (p.payment_status === "autorizzata" || p.payment_status === "pagata")
      return json({ error: "Prenotazione già pagata o autorizzata" }, 400);
    if (p.stato === "rifiutata" || p.stato === "annullata")
      return json({ error: "Prenotazione non più disponibile" }, 400);

    // Importi AUTOREVOLI ricalcolati dal DB: non ci si fida dei valori inviati
    // dal client al momento della richiesta (potrebbero essere manomessi).
    const amount = await computeBookingAmount(admin, p);
    if (amount.totaleCents <= 0) {
      return json({ error: "Importo della prenotazione non valido." }, 400);
    }
    // riallineo la riga se il client aveva scritto valori diversi (audit/coerenza)
    if (
      amount.totaleCents !== p.totale_cents ||
      amount.commissioneCents !== p.commissione_cents
    ) {
      await admin
        .from("prenotazioni")
        .update({
          totale_cents: amount.totaleCents,
          commissione_cents: amount.commissioneCents,
        })
        .eq("id", p.id);
    }

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
            unit_amount: amount.totaleCents,
            product_data: { name: titolo },
          },
        },
      ],
      payment_intent_data: {
        // cattura manuale: i fondi sono bloccati finché l'azienda non approva
        capture_method: "manual",
        application_fee_amount: amount.commissioneCents,
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
