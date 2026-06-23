import { supabase } from "./supabase";
import type { Plan } from "./categories";

/**
 * Pagamenti dei piani via Stripe Checkout.
 *
 * Finché non sono configurate le Edge Functions e le chiavi Stripe, lascia
 * NEXT_PUBLIC_BILLING_ENABLED non impostato (o diverso da "true"): la dashboard
 * ricade sul salvataggio locale della scelta e l'app resta navigabile.
 */
export const billingEnabled =
  process.env.NEXT_PUBLIC_BILLING_ENABLED === "true";

const FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-checkout`
  : "";

/**
 * Avvia il Checkout Stripe per un piano a pagamento e reindirizza l'utente.
 * Lancia un errore (messaggio leggibile) se qualcosa non va.
 */
export async function startCheckout(
  plan: Plan,
  period: "monthly" | "annual",
  extras: string[] = [],
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("Accedi per attivare un abbonamento.");
  }

  const res = await fetch(FUNCTIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      plan,
      period,
      extras,
      returnUrl: window.location.origin,
    }),
  });

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "" }));
    throw new Error(error || "Impossibile avviare il pagamento. Riprova.");
  }

  const { url } = await res.json();
  if (!url) throw new Error("Sessione di pagamento non disponibile.");
  window.location.href = url;
}

/**
 * Apre il Portale Clienti Stripe (fatture, metodo di pagamento, disdetta).
 * Reindirizza l'utente; rilancia un errore leggibile se qualcosa non va.
 */
export async function openCustomerPortal(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Accedi per gestire l'abbonamento.");

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-portal-session`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ returnUrl: window.location.href }),
    },
  );
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "" }));
    throw new Error(error || "Impossibile aprire la gestione abbonamento. Riprova.");
  }
  const { url } = await res.json();
  if (!url) throw new Error("Portale non disponibile.");
  window.location.href = url;
}
