// Edge Function: crea una sessione Stripe Checkout per abbonare l'azienda a un
// piano (Silver/Gold, mensile o annuale). Gira su Supabase (Deno), così la
// chiave SEGRETA Stripe non sta mai nel sito statico.
//
// Il client invia { plan, period, returnUrl } e il proprio access-token (header
// Authorization). La funzione identifica l'utente, trova/crea il cliente Stripe
// e restituisce l'URL del Checkout a cui reindirizzare.
//
// SEGRETI richiesti (Supabase → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY          sk_test_... / sk_live_...
//   PRICE_SILVER_MONTHLY       price_...   (4 Prezzi creati in Stripe)
//   PRICE_SILVER_ANNUAL        price_...
//   PRICE_GOLD_MONTHLY         price_...
//   PRICE_GOLD_ANNUAL          price_...
// SEGRETI OPZIONALI (offerta "Fondatori" sul Gold):
//   FOUNDER_COUPON             id coupon Stripe (durata "forever"); se assente l'offerta è spenta
//   FOUNDER_DEADLINE           data ISO entro cui vale (default 2026-12-31)
// (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sono già iniettati da Supabase.)

import Stripe from "npm:stripe@16.12.0";
import { createClient } from "npm:@supabase/supabase-js@2";

// CORS inline (file unico, deployabile dall'editor del dashboard)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

type Plan = "silver" | "gold";
type Period = "monthly" | "annual";

function priceId(plan: Plan, period: Period): string | undefined {
  const key =
    `PRICE_${plan.toUpperCase()}_${period === "annual" ? "ANNUAL" : "MONTHLY"}`;
  return Deno.env.get(key);
}

// Servizi extra acquistabili insieme all'abbonamento (prezzi ONE-TIME creati in
// Stripe; aggiunti alla PRIMA fattura del Checkout subscription). L'onboarding è
// solo Gold. Se un PRICE non è configurato, il servizio viene semplicemente
// saltato (così il checkout non si rompe finché non crei quel prezzo).
const EXTRA_PRICE: Record<string, string | undefined> = {
  onboarding: Deno.env.get("PRICE_ONBOARDING"),
  badge: Deno.env.get("PRICE_BADGE"),
  report: Deno.env.get("PRICE_REPORT"),
};
const EXTRA_PER_PLAN: Record<Plan, string[]> = {
  silver: ["report", "badge"],
  gold: ["onboarding", "report", "badge"],
};

// Offerta "Fondatori": chi si abbona al Gold entro la scadenza blocca lo sconto
// a vita (il coupon Stripe deve avere durata "forever"). Restituisce l'id del
// coupon da applicare, oppure undefined se l'offerta è spenta o scaduta.
const DEFAULT_FOUNDER_DEADLINE = "2026-12-31";
function founderCoupon(plan: Plan): string | undefined {
  if (plan !== "gold") return undefined;
  const coupon = Deno.env.get("FOUNDER_COUPON");
  if (!coupon) return undefined; // offerta non configurata → nessuno sconto
  const deadline = Deno.env.get("FOUNDER_DEADLINE") ?? DEFAULT_FOUNDER_DEADLINE;
  const end = Date.parse(`${deadline}T23:59:59`);
  if (!Number.isNaN(end) && Date.now() > end) return undefined; // scaduta
  return coupon;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1) identifica l'utente dall'access-token (RLS lato auth)
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return json({ error: "Non autenticato" }, 401);
    }

    // 2) valida l'input
    const { plan, period, returnUrl, extras } = await req.json();
    if (plan !== "silver" && plan !== "gold") {
      return json({ error: "Piano non valido" }, 400);
    }
    const price = priceId(plan, period === "annual" ? "annual" : "monthly");
    if (!price) {
      return json({ error: "Prezzo non configurato per questo piano" }, 500);
    }

    // Servizi extra scelti: ammessi per il piano + con un PRICE configurato.
    const ammessi = EXTRA_PER_PLAN[plan as Plan] ?? [];
    const extraKeys: string[] = Array.isArray(extras) ? extras : [];
    const extraItems: { price: string; quantity: number }[] = [];
    const extraApplicati: string[] = [];
    for (const k of extraKeys) {
      if (!ammessi.includes(k)) continue;
      let pid = EXTRA_PRICE[k];
      // Onboarding: sconto -10% di lancio → usa il prezzo PROMO entro la scadenza.
      if (k === "onboarding") {
        const promo = Deno.env.get("PRICE_ONBOARDING_PROMO");
        const deadline = Deno.env.get("ONBOARDING_PROMO_DEADLINE") ?? "2026-12-31";
        const end = Date.parse(`${deadline}T23:59:59`);
        if (promo && !Number.isNaN(end) && Date.now() <= end) pid = promo;
      }
      if (!pid) continue; // prezzo non ancora creato in Stripe → salta
      extraItems.push({ price: pid, quantity: 1 });
      extraApplicati.push(k);
    }

    // 3) trova o crea il cliente Stripe, ricordandolo su subscriptions
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = sub?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await supabase
        .from("subscriptions")
        .upsert({ user_id: user.id, stripe_customer_id: customerId });
    }

    // 4) crea la sessione di Checkout (abbonamento ricorrente)
    const base = (returnUrl as string) || req.headers.get("origin") || "";
    const founder = founderCoupon(plan);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      // piano (ricorrente) + eventuali servizi extra (one-time, sulla 1ª fattura)
      line_items: [{ price, quantity: 1 }, ...extraItems],
      client_reference_id: user.id,
      metadata: { user_id: user.id, plan, extras: extraApplicati.join(",") },
      // il piano vero viene impostato dal webhook su evento confermato
      subscription_data: {
        metadata: { user_id: user.id, plan, extras: extraApplicati.join(",") },
      },
      success_url: `${base}/dashboard/?abbonamento=ok`,
      cancel_url: `${base}/abbonamenti/?abbonamento=annullato`,
      // Fondatori attivo → applica il coupon a vita; altrimenti consenti i codici
      // promo (Stripe vieta di usare entrambi nella stessa sessione).
      ...(founder
        ? { discounts: [{ coupon: founder }] }
        : { allow_promotion_codes: true }),
      // IVA: prezzi al netto, Stripe Tax aggiunge il 22% in automatico.
      // Serve l'indirizzo del cliente per calcolare l'imposta; raccogliamo anche
      // la P.IVA (B2B) per la fattura/reverse-charge.
      automatic_tax: { enabled: true },
      billing_address_collection: "required",
      customer_update: { address: "auto", name: "auto" },
      tax_id_collection: { enabled: true },
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
