// Edge Function "shop-checkout": pagamento di un ordine SHOP già confermato.
// Flusso Fase D: l'azienda conferma (o il cliente accetta la controproposta) →
// il cliente paga. Destination charge verso l'account Connect del venditore, con
// application fee = commissione del piano. Importo letto dal DB (ordini_shop),
// mai dal client. A pagamento riuscito, lo stato passa a 'pagato' (via webhook).
//
// SEGRETI: STRIPE_SECRET_KEY
// Deploy: supabase functions deploy shop-checkout

import Stripe from "npm:stripe@16.12.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { euroToCents } from "../_shared/booking-amount.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});
const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const COMMISSION_RATE: Record<string, number> = { free: 0, silver: 0.15, gold: 0.08 };

type Articolo = { nome: string; prezzo: string | null; qta: number };

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
      .select("*")
      .eq("id", ordineId)
      .maybeSingle();
    if (!o) return json({ error: "Ordine non trovato" }, 404);
    if (o.cliente_user_id !== user.id) return json({ error: "Non autorizzato" }, 403);
    // Addebito immediato: si paga subito dal carrello (ordine appena creato =
    // "richiesto"). Restano validi anche gli stati del vecchio flusso con conferma.
    if (!["richiesto", "confermato", "accettato"].includes(o.stato)) {
      return json({ error: "L'ordine non è pagabile in questo stato." }, 400);
    }

    // importo autorevole dal DB: lista concordata (controproposta o originale)
    const lista = ((o.controproposta ?? o.articoli) ?? []) as Articolo[];
    const items = lista.filter((a) => a.qta > 0 && euroToCents(a.prezzo) > 0);
    if (!items.length) {
      return json({ error: "Nessun importo da pagare (i prodotti non hanno prezzo)." }, 400);
    }
    const totaleCents = items.reduce(
      (s, a) => s + euroToCents(a.prezzo) * Math.max(1, a.qta),
      0,
    );

    // commissione dal piano del venditore
    const { data: sub } = await admin
      .from("subscriptions")
      .select("plan")
      .eq("user_id", o.owner)
      .maybeSingle();
    const plan = (sub?.plan as string) ?? "free";
    const rate = COMMISSION_RATE[plan] ?? 0;
    const commissioneCents = Math.round(totaleCents * rate);

    // account Connect del venditore
    const { data: acc } = await admin
      .from("stripe_accounts")
      .select("account_id, charges_enabled")
      .eq("user_id", o.owner)
      .maybeSingle();
    if (!acc?.account_id || !acc.charges_enabled) {
      return json({ error: "Il venditore non ha ancora attivato i pagamenti online." }, 400);
    }

    const base =
      o.portale === "BioFido"
        ? "https://mercutio-debug.github.io/biofido"
        : "https://ecovisa.it";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: items.map((a) => ({
        quantity: Math.max(1, a.qta),
        price_data: {
          currency: "eur",
          unit_amount: euroToCents(a.prezzo),
          product_data: { name: a.nome },
        },
      })),
      payment_intent_data: {
        // CATTURA MANUALE: il cliente paga subito ma i fondi restano BLOCCATI
        // (autorizzati). L'azienda poi ACCETTA → si catturano (ordine-accetta),
        // oppure RIFIUTA → si annulla l'autorizzazione e il cliente non paga nulla
        // (ordine-rifiuta). Come per le prenotazioni esperienze.
        capture_method: "manual",
        application_fee_amount: commissioneCents,
        transfer_data: { destination: acc.account_id },
      },
      metadata: { kind: "order_shop", ordine_shop_id: String(o.id) },
      // lego la sessione all'email del cliente loggato: così Stripe/Link mostra il
      // SUO account e non ripesca il profilo salvato di un tester precedente.
      ...(o.cliente_email ? { customer_email: String(o.cliente_email) } : {}),
      // NB: NON raccolgo indirizzo/telefono/CF su Stripe. Nome, indirizzo, CF,
      // SDI/PEC e dati azienda sono già raccolti dalla nostra anagrafica e
      // "fotografati" sull'ordine: chiederli di nuovo qui è ridondante e, con
      // Stripe Link, riempirebbe i campi col profilo salvato di un altro account.
      // includo il session_id: al ritorno l'app chiama verify-ordine-shop per
      // sbloccare l'ordine anche se il webhook non arriva (rete di sicurezza).
      success_url: `${base}/ordini/?pagamento=ok&sid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/ordini/?pagamento=annullato`,
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
