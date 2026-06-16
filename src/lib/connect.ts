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

/** Avvia/riprende l'onboarding Stripe del produttore. */
export function startOnboarding(): Promise<void> {
  return callAndRedirect("connect-onboard");
}

/** Apre il pagamento Stripe per una prenotazione confermata. */
export function payBooking(prenotazioneId: string): Promise<void> {
  return callAndRedirect("booking-pay", { prenotazioneId });
}

/**
 * Rilegge da Stripe lo stato dell'account Connect del produttore e aggiorna il
 * database. Ritorna true se può ricevere pagamenti. Non lancia: in caso di
 * errore ritorna null (il chiamante usa il valore già in DB).
 */
export async function refreshConnectStatus(): Promise<boolean | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return null;
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/connect-status`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      },
    );
    if (!res.ok) return null;
    const { connected } = await res.json();
    return Boolean(connected);
  } catch {
    return null;
  }
}
