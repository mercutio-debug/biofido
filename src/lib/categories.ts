/**
 * Categorie merceologiche di BioFido.
 * Ogni categoria ha un'icona (emoji) e un colore usati per il segnaposto
 * sulla mappa e per i filtri.
 */

export type CategoryId = "agricola" | "negozio" | "ristorante" | "artigiano";

export type Category = {
  id: CategoryId;
  label: string;
  emoji: string;
  /** colore del segnaposto sulla mappa */
  color: string;
};

export const CATEGORIES: Category[] = [
  { id: "agricola", label: "Azienda agricola", emoji: "🌾", color: "#4a8f1e" },
  { id: "negozio", label: "Negozio prodotti bio", emoji: "🛒", color: "#5baf38" },
  { id: "ristorante", label: "Ristorante / agriturismo", emoji: "🍽️", color: "#e8332a" },
  { id: "artigiano", label: "Artigiano", emoji: "🛠️", color: "#d98a00" },
];

export const CATEGORY_MAP: Record<CategoryId, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
) as Record<CategoryId, Category>;

/* ---- Piani di iscrizione ---- */

export type Plan = "free" | "silver" | "gold";

export type StatsLevel = "none" | "base" | "advanced";

/**
 * I "diritti" di un piano: un'unica fonte di verità che dice, per ogni piano,
 * cosa l'azienda può fare. È organizzato in tre famiglie, una per leva di
 * ricavo, così aggiungere prenotazioni o slot sponsor non sparpaglia logica
 * nel codice: si cambia solo questa tabella.
 *
 *  - Presentazione → cosa vede l'utente sulla scheda (Pilastro 1: abbonamenti)
 *  - Commercio     → vendita e commissioni (Pilastro 2: prenotazioni)
 *  - Visibilità    → spinta nel ranking (Pilastro 3: "in evidenza")
 */
export type PlanInfo = {
  id: Plan;
  label: string;
  /** prezzo mensile in € (0 = gratuito) */
  monthlyPrice: number;
  /** prezzo annuale in € (di norma ~2 mesi gratis rispetto al mensile) */
  annualPrice: number;

  /* --- Presentazione (Pilastro 1: dati & visibilità scheda) --- */
  /** dimensione del segnaposto sulla mappa, in pixel */
  markerSize: number;
  /** mostra la categoria nel segnaposto (icona grande) */
  showIcon: boolean;
  /** mostra la descrizione/storia dell'attività */
  showDescription: boolean;
  /** mostra il sito web e i contatti estesi (il telefono è sempre visibile) */
  showWebsite: boolean;
  /** può mostrare prodotti con foto e prezzi */
  showProducts: boolean;
  /** numero massimo di prodotti pubblicabili (0 = nessuno) */
  maxProducts: number;
  /** numero massimo di foto in galleria */
  maxPhotos: number;
  /** può inserire un video nella scheda */
  hasVideo: boolean;
  /** numero massimo di eventi/degustazioni attivi (0 = nessuno) */
  maxEvents: number;
  /** livello di statistiche di traffico disponibili */
  statsLevel: StatsLevel;

  /* --- Commercio (Pilastro 2: prenotazioni & commissioni) --- */
  /** può ricevere prenotazioni/ordini tramite il portale */
  canSell: boolean;
  /** commissione BioFido sulle esperienze prenotate (0.15 = 15%) */
  commissionRate: number;

  /* --- Visibilità (Pilastro 3: ranking) --- */
  /** punti aggiunti al punteggio di ordinamento sulla mappa */
  searchBoost: number;
  /** può acquistare lo slot "in evidenza" della zona */
  featuredEligible: boolean;
  /** ordine di priorità nella lista (più alto = più in alto) — retrocompat. */
  priority: number;
};

/** Ordine dei piani (per capire se un cambio è un downgrade). */
export const PLAN_RANK: Record<Plan, number> = { free: 0, silver: 1, gold: 2 };

/** Vero se passare da `from` a `to` è un downgrade (piano meno ricco). */
export function isDowngrade(from: Plan, to: Plan): boolean {
  return PLAN_RANK[to] < PLAN_RANK[from];
}

/**
 * Elenco leggibile di cosa NON sarà più visibile sulla scheda passando dal
 * piano `from` al piano `to` (i dati restano salvati, tornano col re-upgrade).
 * Allineato ai gate di visualizzazione della SchedaImpresaModal:
 * foto/prezzo e catalogo = Gold; prenotabile = canSell; copertina/descrizione = showDescription.
 */
export function perditeDowngrade(from: Plan, to: Plan): string[] {
  const a = PLAN_MAP[from];
  const b = PLAN_MAP[to];
  const perse: string[] = [];
  if (a.maxProducts > b.maxProducts) {
    const lim = b.maxProducts === Infinity ? "illimitati" : b.maxProducts;
    perse.push(`i prodotti oltre i ${lim} previsti dal piano (restano salvati ma nascosti)`);
  }
  if (from === "gold" && to !== "gold") {
    perse.push("le foto e i prezzi dei prodotti");
    perse.push("il catalogo (prodotti in vendita e servizi su prenotazione)");
  }
  if (a.canSell && !b.canSell) {
    perse.push("i servizi/esperienze prenotabili e i pagamenti online dei clienti");
  }
  if (a.showDescription && !b.showDescription) {
    perse.push("la scheda ricca: copertina, descrizione e link al sito");
  }
  if (a.statsLevel !== "none" && b.statsLevel === "none") {
    perse.push("le statistiche di visite e azioni");
  } else if (a.statsLevel === "advanced" && b.statsLevel === "base") {
    perse.push("le statistiche avanzate (resta quella base)");
  }
  return perse;
}

export const PLAN_MAP: Record<Plan, PlanInfo> = {
  free: {
    id: "free", label: "Gratuito", monthlyPrice: 0, annualPrice: 0,
    markerSize: 26, showIcon: false, showDescription: false, showWebsite: false,
    showProducts: true, maxProducts: 1, maxPhotos: 0, hasVideo: false,
    maxEvents: 0, statsLevel: "none",
    canSell: false, commissionRate: 0,
    searchBoost: 0, featuredEligible: false, priority: 0,
  },
  silver: {
    id: "silver", label: "Silver", monthlyPrice: 9, annualPrice: 90,
    markerSize: 38, showIcon: true, showDescription: true, showWebsite: true,
    showProducts: true, maxProducts: 10, maxPhotos: 3, hasVideo: false,
    maxEvents: 1, statsLevel: "base",
    canSell: true, commissionRate: 0.15,   // fee piena
    searchBoost: 10, featuredEligible: false, priority: 1,
  },
  gold: {
    id: "gold", label: "Gold", monthlyPrice: 19, annualPrice: 190,
    markerSize: 50, showIcon: true, showDescription: true, showWebsite: true,
    showProducts: true, maxProducts: 100, maxPhotos: 3, hasVideo: true,
    maxEvents: Infinity, statsLevel: "advanced",
    canSell: true, commissionRate: 0.08,   // fee ridotta: incentivo a salire di piano
    searchBoost: 25, featuredEligible: true, priority: 2,
  },
};

/**
 * Commissione applicata in fase di lancio agli ordini di PRODOTTO FISICO
 * (margini sottili): per ora 0, si attiverà quando il traffico è dimostrabile.
 * Le esperienze (visite, degustazioni, corsi) usano invece `commissionRate`.
 */
export const PRODUCT_COMMISSION_RATE = 0;

/**
 * Punteggio di ordinamento di un'attività sulla mappa.
 * La distanza domina sempre (km0 credibile: chi è vicino resta in alto),
 * ma il piano dà una spinta misurabile (~10 punti di boost ≈ 1 km).
 * Valori più alti = più in alto nei risultati.
 */
export function rankScore(plan: Plan, distanceKm: number): number {
  return -distanceKm + PLAN_MAP[plan].searchBoost * 0.1;
}
