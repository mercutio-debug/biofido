// Edge Function "verify-ordine-shop": RETE DI SICUREZZA indipendente dal webhook.
// Quando il cliente torna dalla pagina di pagamento Stripe (success_url con il
// session_id), l'app chiama questa funzione: recupera la sessione da Stripe,
// verifica che sia COMPLETATA (pagamento autorizzato con manual capture) e che
// appartenga a un ordine del chiamante, poi porta l'ordine a "autorizzato".
// Così l'ordine si sblocca anche se il webhook non è arrivato/ha fallito.
// Idempotente: aggiorna SOLO se l'ordine è ancora "richiesto" (se il webhook ha
// già fatto il lavoro, qui non tocca nulla → niente doppioni).
//
// SEGRETI: STRIPE_SECRET_KEY. SUPABASE_* automatici.
// Deploy: supabase functions deploy verify-ordine-shop --project-ref kvpxnxsjiyiixqksinzr

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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

    const { sessionId } = await req.json();
    if (!sessionId) return json({ error: "sessionId mancante" }, 400);

    const s = await stripe.checkout.sessions.retrieve(String(sessionId));
    if (s.metadata?.kind !== "order_shop") {
      return json({ error: "Sessione non valida" }, 400);
    }
    const ordineId = s.metadata?.ordine_shop_id;
    if (!ordineId) return json({ error: "Ordine non collegato" }, 400);

    const { data: o } = await admin
      .from("ordini_shop")
      .select("id, cliente_user_id, stato")
      .eq("id", ordineId)
      .maybeSingle();
    if (!o) return json({ error: "Ordine non trovato" }, 404);
    if (o.cliente_user_id !== user.id) return json({ error: "Non autorizzato" }, 403);

    // la sessione è "complete" quando il cliente ha completato il pagamento
    // (con manual capture i fondi sono AUTORIZZATI, non ancora catturati)
    if (s.status !== "complete") {
      return json({ ok: false, stato: o.stato, pagato: false });
    }
    // già sbloccato dal webhook? niente da fare (idempotente)
    if (o.stato !== "richiesto") {
      return json({ ok: true, stato: o.stato, giaSbloccato: true });
    }

    // NB: indirizzo/telefono/CF NON si leggono più da Stripe. La scheda cliente
    // (anagrafica + eventuali dati azienda) è già "fotografata" sull'ordine alla
    // creazione: sovrascriverla con i dati di Stripe Link porterebbe dentro il
    // profilo salvato di un altro account (bug riscontrato in test).

    // aggiorno SOLO se ancora "richiesto" (condizione nel WHERE → niente race col webhook)
    const { data: upd } = await admin
      .from("ordini_shop")
      .update({
        stato: "autorizzato",
        stripe_payment_intent: s.payment_intent ? String(s.payment_intent) : null,
        totale_cents: s.amount_total ?? null,
        stripe_session_id: s.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", o.id)
      .eq("stato", "richiesto")
      .select("id");

    return json({ ok: true, stato: "autorizzato", aggiornato: (upd?.length ?? 0) > 0 });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
