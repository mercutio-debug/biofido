import { supabase } from "./supabase";

/**
 * Analisi AI del materiale di onboarding «Ci pensiamo noi». Manda testo + URL
 * delle foto caricate alla edge function `onboarding-estrai` (Claude Sonnet vision),
 * che estrae i prodotti SENZA inventare nulla e restituisce anche una RICEVUTA
 * trasparente. Serve il token utente: la funzione verifica login + acquisto onboarding.
 */
export type MateriaPrima = { nome: string; origine: string };
export type ProdottoEstratto = {
  nome: string;
  categoria: string;
  descrizione: string;
  descrizione_fornita: boolean;
  foto_fornita: boolean;
  materie_prime: MateriaPrima[];
  foto_url?: string | null;
  foto_auto?: boolean;
};

export async function estraiOnboarding(
  testo: string,
  immagini: string[],
): Promise<{ prodotti?: ProdottoEstratto[]; ricevuta?: string[]; error?: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: "Accedi per usare l'analisi." };
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return { error: "Configurazione mancante." };
  try {
    const res = await fetch(`${base}/functions/v1/onboarding-estrai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ testo, immagini }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) return { error: data.error || "Analisi non riuscita." };
    return { prodotti: data.prodotti as ProdottoEstratto[], ricevuta: data.ricevuta as string[] };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
