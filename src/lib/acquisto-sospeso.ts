/**
 * Acquisto in sospeso: quando l'utente avvia il pagamento e poi lo abbandona
 * (torna indietro da Stripe), NON deve perdere la selezione. Salviamo qui in
 * localStorage il piano + periodo + servizi extra scelti, così la dashboard può
 * mostrare la card "Completa il tuo acquisto" e riprendere con un click.
 *
 * (La versione server-side per il sollecito via email vive a parte: vedi la
 * funzione schedulata `solleciti-mail`.)
 */
const KEY = "biofido_acquisto_sospeso";

export type AcquistoSospeso = {
  plan: string;
  period: "monthly" | "annual";
  extras: string[];
  ts: number;
};

export function salvaAcquistoSospeso(a: Omit<AcquistoSospeso, "ts">): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...a, ts: Date.now() }));
  } catch {
    /* localStorage non disponibile: pazienza */
  }
}

export function getAcquistoSospeso(): AcquistoSospeso | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const a = JSON.parse(raw) as AcquistoSospeso;
    return a && a.plan ? a : null;
  } catch {
    return null;
  }
}

export function pulisciAcquistoSospeso(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* niente */
  }
}
