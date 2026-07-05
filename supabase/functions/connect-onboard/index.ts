// Edge Function "connect-onboard": collega il produttore a Stripe Connect
// (account Express) e restituisce il link di onboarding. Va chiamata dal
// client con l'access-token del produttore.
//
// SEGRETI: STRIPE_SECRET_KEY, SITE_URL
// Deploy: supabase functions deploy connect-onboard

import Stripe from "npm:stripe@16.12.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});
const SITE_URL = Deno.env.get("SITE_URL") ?? "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    // client col token UTENTE: serve solo a identificare chi chiama
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    // client SERVICE ROLE (senza header utente) per leggere/scrivere stripe_accounts
    // bypassando la RLS. Col client "utente" l'upsert gira come authenticated e la
    // RLS lo blocca in silenzio → la riga non si salva e il collegamento non risulta.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return json({ error: "Non autenticato" }, 401);

    // riusa l'account esistente o ne crea uno nuovo
    const { data: row } = await admin
      .from("stripe_accounts")
      .select("account_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let accountId = row?.account_id as string | undefined;
    if (!accountId) {
      // Controller ESPLICITO, obbligato dalla dashboard Express:
      // Stripe impone che con `stripe_dashboard.type=express` la PIATTAFORMA
      // incassi le commissioni (fees=application) e sia responsabile di perdite
      // e chargeback (losses=application). Non è una scelta: Express = questo.
      // (Per avere perdite→Stripe/commissioni→venditore servirebbero account
      // Standard "full", onboarding troppo pesante per i piccoli produttori.)
      // Combacia col Profilo piattaforma già attestato → niente più errore.
      const account = await stripe.accounts.create({
        controller: {
          losses: { payments: "application" },
          fees: { payer: "application" },
          stripe_dashboard: { type: "express" },
        },
        email: user.email,
        metadata: { user_id: user.id },
        // solo `transfers`: col modello destination charges il produttore deve
        // RICEVERE i trasferimenti, non incassare carte in proprio. Niente
        // card_payments → onboarding più leggero e prontezza più pulita.
        capabilities: {
          transfers: { requested: true },
        },
      });
      accountId = account.id;
      const { error: upErr } = await admin
        .from("stripe_accounts")
        .upsert({ user_id: user.id, account_id: accountId });
      if (upErr) console.error("connect-onboard: upsert stripe_accounts fallito:", upErr.message);
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${SITE_URL}/dashboard/?stripe=refresh`,
      return_url: `${SITE_URL}/dashboard/?stripe=ok`,
      type: "account_onboarding",
    });

    return json({ url: link.url });
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
