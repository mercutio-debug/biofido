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
    const { plan, period, returnUrl } = await req.json();
    if (plan !== "silver" && plan !== "gold") {
      return json({ error: "Piano non valido" }, 400);
    }
    const price = priceId(plan, period === "annual" ? "annual" : "monthly");
    if (!price) {
      return json({ error: "Prezzo non configurato per questo piano" }, 500);
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
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      client_reference_id: user.id,
      metadata: { user_id: user.id, plan },
      // il piano vero viene impostato dal webhook su evento confermato
      subscription_data: { metadata: { user_id: user.id, plan } },
      success_url: `${base}/dashboard/?abbonamento=ok`,
      cancel_url: `${base}/abbonamenti/?abbonamento=annullato`,
      allow_promotion_codes: true,
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
