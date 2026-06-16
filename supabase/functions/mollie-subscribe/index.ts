// Edge Function "mollie-subscribe": avvia l'abbonamento di un'azienda a un piano.
// Crea (o riusa) il cliente Mollie e un primo pagamento; alla conferma (webhook)
// si crea la sottoscrizione ricorrente.
//
// SEGRETI: MOLLIE_API_KEY, SUPABASE_URL, SITE_URL
// Deploy: supabase functions deploy mollie-subscribe

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { mollie, eur, PLAN_PRICE } from "../_shared/mollie.ts";

const SITE_URL = Deno.env.get("SITE_URL") ?? "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return json({ error: "Non autenticato" }, 401);

    const { plan, period } = await req.json();
    const prices = PLAN_PRICE[plan];
    if (!prices) return json({ error: "Piano non valido" }, 400);
    const amount = period === "annual" ? prices.annual : prices.monthly;

    // cliente Mollie (riusa quello salvato)
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("mollie_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = sub?.mollie_customer_id as string | undefined;
    if (!customerId) {
      const customer = await mollie("/customers", {
        method: "POST",
        body: JSON.stringify({ name: user.email, email: user.email }),
      });
      customerId = customer.id as string;
      await supabase
        .from("subscriptions")
        .upsert({ user_id: user.id, mollie_customer_id: customerId });
    }

    // primo pagamento per stabilire il mandato
    const payment = await mollie("/payments", {
      method: "POST",
      body: JSON.stringify({
        amount: eur(amount),
        customerId,
        sequenceType: "first",
        description: `BioFido ${plan} (${period === "annual" ? "annuale" : "mensile"})`,
        redirectUrl: `${SITE_URL}/dashboard/?abbonamento=ok`,
        webhookUrl: `${supabaseUrl}/functions/v1/mollie-webhook`,
        metadata: { kind: "subscription", user_id: user.id, plan, period },
      }),
    });

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
