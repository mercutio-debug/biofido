// Edge Function: webhook Stripe. Stripe la chiama quando un pagamento va a buon
// fine o un abbonamento cambia stato. Qui aggiorniamo la tabella subscriptions
// e propaghiamo il piano alle schede mappa dell'utente (biofido_businesses).
//
// Scrive con la SERVICE-ROLE key (bypassa la RLS): è l'unico punto autorizzato
// a cambiare il piano pagato, così nessun utente può falsificarlo dal client.
//
// SEGRETI richiesti:
//   STRIPE_SECRET_KEY        sk_...
//   STRIPE_WEBHOOK_SECRET    whsec_...  (lo dà Stripe quando registri il webhook)
//
// Nota: registra questa funzione SENZA verifica JWT (è Stripe a chiamarla),
//   supabase functions deploy stripe-webhook --no-verify-jwt

import Stripe from "npm:stripe@16.12.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

/** Aggiorna l'abbonamento e allinea il piano delle schede dell'utente. */
async function setPlan(
  userId: string,
  plan: "free" | "silver" | "gold",
  fields: Record<string, unknown>,
) {
  await admin
    .from("subscriptions")
    .upsert({ user_id: userId, plan, updated_at: new Date().toISOString(), ...fields });
  // Propaga il piano a tutte le schede mappa possedute dall'utente.
  await admin.from("biofido_businesses").update({ plan }).eq("owner", userId);
}

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig!, webhookSecret);
  } catch (e) {
    return new Response(`Firma non valida: ${(e as Error).message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.object as Stripe.Checkout.Session;
        const userId = s.metadata?.user_id ?? s.client_reference_id ?? "";
        const plan = (s.metadata?.plan as "silver" | "gold") ?? "silver";
        if (userId) {
          await setPlan(userId, plan, {
            status: "active",
            stripe_customer_id: s.customer as string,
            stripe_subscription_id: s.subscription as string,
          });
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id ?? "";
        const plan = (sub.metadata?.plan as "silver" | "gold") ?? "silver";
        const active = sub.status === "active" || sub.status === "trialing";
        if (userId) {
          await setPlan(userId, active ? plan : "free", {
            status: sub.status,
            stripe_subscription_id: sub.id,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id ?? "";
        if (userId) {
          // abbonamento finito: si torna al piano gratuito
          await setPlan(userId, "free", { status: "canceled" });
        }
        break;
      }
    }
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response((e as Error).message, { status: 500 });
  }
});
