// Edge Function: CAMBIO PIANO di un abbonamento già attivo (Silver↔Gold).
//
// Regola (vedi memoria "upgrade-piano-proration"):
//   • UPGRADE  (es. Silver→Gold): si paga SUBITO solo la DIFFERENZA per i giorni
//     rimanenti → `proration_behavior: "always_invoice"`.
//   • DOWNGRADE (es. Gold→Silver): scatta a FINE CICLO (mantiene i vantaggi fino
//     alla scadenza) → tramite Subscription Schedule a 2 fasi.
//
// Il client invia { plan, period } + l'access-token. Il piano vero viene poi
// sincronizzato dal webhook (customer.subscription.updated).
//
// SEGRETI: STRIPE_SECRET_KEY + i PRICE_* (gli stessi di create-checkout).
// (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sono iniettati da Supabase.)

import Stripe from "npm:stripe@16.12.0";
import { createClient } from "npm:@supabase/supabase-js@2";

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
const RANK: Record<string, number> = { free: 0, silver: 1, gold: 2 };

function priceId(plan: Plan, period: Period): string | undefined {
  return Deno.env.get(`PRICE_${plan.toUpperCase()}_${period === "annual" ? "ANNUAL" : "MONTHLY"}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return json({ error: "Non autenticato" }, 401);

    const { plan, period } = await req.json();
    if (plan !== "silver" && plan !== "gold") return json({ error: "Piano non valido" }, 400);
    const newPrice = priceId(plan, period === "annual" ? "annual" : "monthly");
    if (!newPrice) return json({ error: "Prezzo non configurato per questo piano" }, 500);

    // abbonamento Stripe esistente dell'utente
    const { data: row } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id, plan")
      .eq("user_id", user.id)
      .maybeSingle();
    const subId = row?.stripe_subscription_id as string | undefined;
    if (!subId) {
      return json(
        { error: "Nessun abbonamento attivo da modificare: usa il normale pagamento.", needsCheckout: true },
        409,
      );
    }

    const sub = await stripe.subscriptions.retrieve(subId);
    const item = sub.items.data[0];
    const currentPrice = item.price.id;
    if (currentPrice === newPrice) return json({ error: "È già il tuo piano attuale." }, 400);

    const curRank = RANK[(row?.plan as string) ?? "free"] ?? 0;
    const newRank = RANK[plan] ?? 0;

    if (newRank >= curRank) {
      // UPGRADE: addebita subito la differenza (proration)
      await stripe.subscriptions.update(subId, {
        items: [{ id: item.id, price: newPrice }],
        proration_behavior: "always_invoice",
        metadata: { user_id: user.id, plan },
      });
      return json({ ok: true, mode: "upgrade" });
    }

    // DOWNGRADE: applica a fine ciclo tramite Subscription Schedule
    let schedId = (sub.schedule as string | null) ?? null;
    if (!schedId) {
      const created = await stripe.subscriptionSchedules.create({ from_subscription: subId });
      schedId = created.id;
    }
    const sched = await stripe.subscriptionSchedules.retrieve(schedId);
    const cur = sched.phases[sched.phases.length - 1];
    await stripe.subscriptionSchedules.update(schedId, {
      end_behavior: "release",
      phases: [
        {
          items: [{ price: currentPrice, quantity: 1 }],
          start_date: cur.start_date,
          end_date: cur.end_date,
        },
        {
          items: [{ price: newPrice, quantity: 1 }],
          metadata: { user_id: user.id, plan },
        },
      ],
      metadata: { user_id: user.id, plan },
    });
    return json({ ok: true, mode: "downgrade", effectiveAt: cur.end_date });
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
