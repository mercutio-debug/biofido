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

/** Carica la bozza salvata (prodotti estratti) dell'azienda loggata. */
export async function loadBozza(): Promise<{ prodotti: ProdottoEstratto[]; testo: string } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("onboarding_bozza")
    .select("prodotti, testo")
    .eq("owner", user.id)
    .maybeSingle();
  if (!data) return null;
  return {
    prodotti: ((data as { prodotti?: ProdottoEstratto[] }).prodotti ?? []) as ProdottoEstratto[],
    testo: (data as { testo?: string }).testo ?? "",
  };
}

/** Salva le modifiche dell'azienda alla bozza (es. descrizioni completate). */
export async function salvaBozza(prodotti: ProdottoEstratto[]): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Accedi per salvare." };
  const { error } = await supabase
    .from("onboarding_bozza")
    .update({ prodotti, updated_at: new Date().toISOString() })
    .eq("owner", user.id);
  return { error: error?.message };
}

/** Pubblica la bozza nella scheda reale (chiama la edge onboarding-pubblica). */
export async function pubblicaBozza(): Promise<{ ok?: boolean; error?: string; creati?: number }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: "Accedi per pubblicare." };
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return { error: "Configurazione mancante." };
  try {
    const res = await fetch(`${base}/functions/v1/onboarding-pubblica`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) return { error: data.error || "Pubblicazione non riuscita." };
    return { ok: true, creati: data.creati };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

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
