// Edge Function "connect-status": rilegge da Stripe lo stato dell'account
// Connect del produttore e aggiorna stripe_accounts.charges_enabled. Così il
// flusso pagamenti non dipende solo dall'evento webhook account.updated (che nel
// nuovo Stripe può arrivare su uno scope diverso).
//
// SEGRETI: STRIPE_SECRET_KEY. SUPABASE_* automatici.
// Deploy: supabase functions deploy connect-status

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

    const { data: row } = await admin
      .from("stripe_accounts")
      .select("account_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const accountId = (row as { account_id?: string } | null)?.account_id;
    if (!accountId) return json({ connected: false });

    const account = await stripe.accounts.retrieve(accountId);
    await admin.from("stripe_accounts").upsert({
      user_id: user.id,
      account_id: accountId,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      updated_at: new Date().toISOString(),
    });

    return json({ connected: account.charges_enabled });
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
