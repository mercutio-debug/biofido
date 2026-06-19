// Edge Function "create-portal-session": apre il Portale Clienti Stripe (Billing
// Portal) per l'utente loggato, così può vedere le fatture, cambiare carta e
// soprattutto DISDIRE l'abbonamento in autonomia.
//
// SEGRETI: STRIPE_SECRET_KEY (già configurato). SUPABASE_* sono automatici.
// NB: il Portale va attivato una volta in Stripe (Settings → Billing → Customer
//     portal → Save), altrimenti l'API risponde "No configuration provided".
//
// Deploy: supabase functions deploy create-portal-session

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

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // identifica l'utente dal suo access-token
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return json({ error: "Non autenticato" }, 401);

    // cliente Stripe collegato a questo utente
    const { data: sub } = await admin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    const customer = sub?.stripe_customer_id as string | undefined;
    if (!customer) {
      return json({ error: "Nessun abbonamento collegato a questo account." }, 400);
    }

    const { returnUrl } = await req.json().catch(() => ({}));
    const portal = await stripe.billingPortal.sessions.create({
      customer,
      return_url: (returnUrl as string) || req.headers.get("origin") || "",
    });

    return json({ url: portal.url });
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
