import { supabase } from "./supabase";

/**
 * Stripe Connect: onboarding del produttore e pagamento delle prenotazioni.
 * Riusa il flag NEXT_PUBLIC_BILLING_ENABLED (vedi billing.ts): finché i
 * pagamenti non sono configurati, i pulsanti relativi restano nascosti.
 */
const FUNCTIONS_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
  : "";

async function callAndRedirect(fn: string, body?: unknown): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Accedi per continuare.");

  const res = await fetch(`${FUNCTIONS_BASE}/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "" }));
    throw new Error(error || "Operazione non riuscita. Riprova.");
  }
  const { url } = await res.json();
  if (!url) throw new Error("Link non disponibile.");
  window.location.href = url;
}

/** Avvia/riprende il collegamento Mollie del produttore (OAuth). */
export function startOnboarding(): Promise<void> {
  return callAndRedirect("mollie-connect-start");
}

/** Apre il pagamento Mollie per una prenotazione confermata. */
export function payBooking(prenotazioneId: string): Promise<void> {
  return callAndRedirect("mollie-booking-pay", { prenotazioneId });
}
