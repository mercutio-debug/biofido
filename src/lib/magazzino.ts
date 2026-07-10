/**
 * Livello delle scorte a magazzino di un prodotto, in base alla giacenza ATTUALE
 * rispetto a quella INIZIALE (scorta piena di riferimento). Scala monotòna
 * verde→rosso: più la scorta cala, più il colore è allarmante.
 *   > 3/4        → verde   (piena)
 *   1/2 – 3/4    → giallo  (inizia a calare)
 *   1/3 – 1/2    → arancione (in calo)
 *   ≤ 1/3        → rosso   (da riordinare / esaurito)
 * Usato per il pallino accanto alla voce «Magazzino» e nella tabella scorte.
 * Coerente con gli avvisi email alla vendita (soglie 1/2 e 1/3).
 */
export type LivelloMagazzino = "verde" | "giallo" | "arancione" | "rosso";

export const COLORE_MAGAZZINO: Record<LivelloMagazzino, string> = {
  verde: "#45a82f",
  giallo: "#e7af0b",
  arancione: "#e8820b",
  rosso: "#e24b4a",
};

export const ETICHETTA_MAGAZZINO: Record<LivelloMagazzino, string> = {
  verde: "Scorta piena",
  giallo: "Inizia a calare",
  arancione: "In calo",
  rosso: "Da riordinare",
};

/**
 * Livello della scorta attuale vs iniziale. Ritorna `null` se il prodotto NON
 * gestisce la giacenza (scorta illimitata / non tracciata): niente pallino.
 */
export function livelloMagazzino(
  giacenza: number | null | undefined,
  iniziale: number | null | undefined,
): LivelloMagazzino | null {
  if (giacenza == null) return null; // scorta non gestita
  // se manca l'iniziale, uso la giacenza stessa come riferimento (→ verde)
  const ref = iniziale != null && iniziale > 0 ? iniziale : giacenza;
  if (ref <= 0) return "rosso";
  const r = giacenza / ref;
  if (r > 3 / 4) return "verde";
  if (r > 1 / 2) return "giallo";
  if (r > 1 / 3) return "arancione";
  return "rosso";
}

const RANK: Record<LivelloMagazzino, number> = { verde: 0, giallo: 1, arancione: 2, rosso: 3 };

/** Livello PEGGIORE tra tanti (per il pallino unico accanto a «Magazzino»). */
export function peggiorLivello(livelli: (LivelloMagazzino | null)[]): LivelloMagazzino | null {
  let worst: LivelloMagazzino | null = null;
  for (const l of livelli) {
    if (!l) continue;
    if (worst == null || RANK[l] > RANK[worst]) worst = l;
  }
  return worst;
}
