// Edge Function "mollie-webhook": Mollie la chiama (con l'id del pagamento)
// quando lo stato cambia. Per i pagamenti "pagati":
//  - prenotazione  -> payment_status = "pagata"
//  - abbonamento   -> crea la sottoscrizione ricorrente e attiva il piano
//
// SEGRETI: MOLLIE_API_KEY, SUPABASE_URL, SITE_URL
// Deploy: supabase functions deploy mollie-webhook --no-verify-jwt

import { createClient } from "npm:@supabase/supabase-js@2";
import { mollie, eur, PLAN_PRICE } from "../_shared/mollie.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function setPlan(userId: string, plan: string, fields: Record<string, unknown>) {
  await admin
    .from("subscriptions")
    .upsert({ user_id: userId, plan, status: "active", updated_at: new Date().toISOString(), ...fields });
  await admin.from("biofido_businesses").update({ plan }).eq("owner", userId);
}

Deno.serve(async (req) => {
  try {
    const body = await req.text();
    const id = new URLSearchParams(body).get("id");
    if (!id) return new Response("ok");

    const payment = (await mollie(`/payments/${id}`)) as {
      status: string;
      customerId?: string;
      metadata?: { kind?: string; prenotazione_id?: string; user_id?: string; plan?: string; period?: string };
    };
    if (payment.status !== "paid") return new Response("ok");

    const meta = payment.metadata ?? {};

    if (meta.kind === "booking" && meta.prenotazione_id) {
      await admin
        .from("prenotazioni")
        .update({ payment_status: "pagata" })
        .eq("id", meta.prenotazione_id);
      return new Response("ok");
    }

    if (meta.kind === "subscription" && meta.user_id && meta.plan && payment.customerId) {
      const prices = PLAN_PRICE[meta.plan];
      const monthly = meta.period === "annual" ? prices.annual : prices.monthly;
      const interval = meta.period === "annual" ? "12 months" : "1 month";

      // crea la sottoscrizione ricorrente sul cliente
      const sub = await mollie(`/customers/${payment.customerId}/subscriptions`, {
        method: "POST",
        body: JSON.stringify({
          amount: eur(monthly),
          interval,
          description: `BioFido ${meta.plan}`,
          webhookUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mollie-webhook`,
          metadata: { user_id: meta.user_id, plan: meta.plan },
        }),
      });

      await setPlan(meta.user_id, meta.plan, {
        mollie_customer_id: payment.customerId,
        mollie_subscription_id: sub.id,
      });
    }

    return new Response("ok");
  } catch (e) {
    console.error(e);
    return new Response((e as Error).message, { status: 500 });
  }
});
