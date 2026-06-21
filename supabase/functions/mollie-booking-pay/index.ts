// Edge Function "mollie-booking-pay": il cliente paga una prenotazione
// CONFERMATA. Il pagamento è "routed": la quota del produttore va al suo account
// Mollie collegato, BioFido trattiene la commissione (resto non instradato).
//
// SEGRETI: MOLLIE_API_KEY, SUPABASE_URL, SITE_URL
// Deploy: supabase functions deploy mollie-booking-pay

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { mollie, eur } from "../_shared/mollie.ts";
import { computeBookingAmount } from "../_shared/booking-amount.ts";

const SITE_URL = Deno.env.get("SITE_URL") ?? "";
const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(
      supabaseUrl,
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
      .select("id, owner, cliente_user_id, stato, payment_status, persone, esperienza_id, prodotto_id, voce_id, totale_cents, commissione_cents, esperienze(titolo)")
      .eq("id", prenotazioneId)
      .maybeSingle();

    if (!p) return json({ error: "Prenotazione non trovata" }, 404);
    if (p.cliente_user_id !== user.id) return json({ error: "Non autorizzato" }, 403);
    if (p.stato !== "confermata") return json({ error: "La prenotazione non è ancora confermata" }, 400);
    if (p.payment_status === "pagata") return json({ error: "Prenotazione già pagata" }, 400);

    // Importi AUTOREVOLI ricalcolati dal DB (mai dai valori inviati dal client).
    const amount = await computeBookingAmount(admin, p);
    if (amount.totaleCents <= 0) {
      return json({ error: "Importo della prenotazione non valido." }, 400);
    }
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

    const { data: acc } = await admin
      .from("mollie_accounts")
      .select("org_id, connected")
      .eq("user_id", p.owner)
      .maybeSingle();
    if (!acc?.org_id || !acc.connected) {
      return json({ error: "Il produttore non ha ancora attivato i pagamenti online." }, 400);
    }

    const totale = amount.totaleCents / 100;
    const quotaProduttore = (amount.totaleCents - amount.commissioneCents) / 100;
    const titolo =
      (p as { esperienze?: { titolo?: string } }).esperienze?.titolo ?? "Esperienza";

    const payment = await mollie("/payments", {
      method: "POST",
      body: JSON.stringify({
        amount: eur(totale),
        description: `Prenotazione: ${titolo}`,
        redirectUrl: `${SITE_URL}/prenotazioni/?pagamento=ok`,
        webhookUrl: `${supabaseUrl}/functions/v1/mollie-webhook`,
        metadata: { kind: "booking", prenotazione_id: String(p.id) },
        // la commissione BioFido è il resto non instradato al produttore
        routing: [
          {
            amount: eur(quotaProduttore),
            destination: { type: "organization", organizationId: acc.org_id },
          },
        ],
      }),
    });

    await admin
      .from("prenotazioni")
      .update({ mollie_payment_id: payment.id })
      .eq("id", p.id);

    const url = (payment._links as { checkout?: { href?: string } })?.checkout?.href;
    return json({ url });
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
