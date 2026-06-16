// Edge Function: webhook Stripe. Gestisce:
//  - abbonamenti (subscriptions) → aggiorna il piano dell'utente
//  - pagamenti delle prenotazioni (Connect) → marca la prenotazione "pagata"
//  - account.updated (Connect) → aggiorna lo stato dell'account del produttore
//
// Scrive con la SERVICE-ROLE key (bypassa la RLS): è l'unico punto autorizzato
// a cambiare piano/stato pagamento, così nessuno può falsificarli dal client.
//
// SEGRETI richiesti:
//   STRIPE_SECRET_KEY        sk_...
//   STRIPE_WEBHOOK_SECRET    whsec_...  (lo dà Stripe quando registri il webhook)
//
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt

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
        const s = event.data.object as Stripe.Checkout.Session;
        // Pagamento di una prenotazione (Connect)
        if (s.metadata?.kind === "booking") {
          const prenotazioneId = s.metadata?.prenotazione_id;
          if (prenotazioneId) {
            await admin
              .from("prenotazioni")
              .update({ payment_status: "pagata", stripe_session_id: s.id })
              .eq("id", prenotazioneId);
          }
          break;
        }
        // Altrimenti: attivazione abbonamento
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
        const sub = event.data.object as Stripe.Subscription;
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
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id ?? "";
        if (userId) await setPlan(userId, "free", { status: "canceled" });
        break;
      }
      case "account.updated": {
        // stato dell'account Connect del produttore
        const acc = event.data.object as Stripe.Account;
        const userId = acc.metadata?.user_id ?? "";
        if (userId) {
          await admin.from("stripe_accounts").upsert({
            user_id: userId,
            account_id: acc.id,
            charges_enabled: acc.charges_enabled,
            payouts_enabled: acc.payouts_enabled,
            updated_at: new Date().toISOString(),
          });
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
