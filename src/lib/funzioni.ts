import { PLAN_MAP, type Plan } from "./categories";

/**
 * Catalogo delle funzioni e dei passi di onboarding, con il piano minimo che le
 * sblocca. Alimenta la "scheda guida" in dashboard: cosa è attivo col piano
 * corrente e cosa si sblocca passando al piano successivo.
 */

/** vero se il piano `current` include ciò che richiede almeno `min`. */
export function planAllows(current: Plan, min: Plan): boolean {
  return PLAN_MAP[current].priority >= PLAN_MAP[min].priority;
}

/** piano successivo a quello dato (null se è già il massimo). */
export function nextPlan(plan: Plan): Plan | null {
  if (plan === "free") return "silver";
  if (plan === "silver") return "gold";
  return null;
}

/** Passi operativi: cosa fare, in ordine. `anchor` = sezione a cui scorrere.
 *  `key` identifica il passo per spuntarlo come completato. */
export type PassoKey =
  | "scheda"
  | "notifiche"
  | "esperienze"
  | "pagamenti"
  | "prodotti";

export type Passo = {
  key: PassoKey;
  titolo: string;
  descr: string;
  anchor: string;
  minPlan: Plan;
};

export const PASSI: Passo[] = [
  {
    key: "scheda",
    titolo: "Completa la scheda della tua attività",
    descr: "Nome, categoria, città, contatti e descrizione: è ciò che appare sulla mappa.",
    anchor: "scheda",
    minPlan: "free",
  },
  {
    key: "notifiche",
    titolo: "Attiva le notifiche",
    descr: "Ricevi un avviso quando arriva una prenotazione o un messaggio.",
    anchor: "notifiche",
    minPlan: "free",
  },
  {
    key: "esperienze",
    titolo: "Pubblica un'esperienza prenotabile",
    descr: "Visite, degustazioni o corsi che i clienti possono prenotare dal portale.",
    anchor: "esperienze",
    minPlan: "silver",
  },
  {
    key: "pagamenti",
    titolo: "Collega Stripe per incassare",
    descr: "Ricevi online i pagamenti delle prenotazioni confermate.",
    anchor: "pagamenti",
    minPlan: "silver",
  },
  {
    key: "prodotti",
    titolo: "Aggiungi i tuoi prodotti",
    descr: "Prodotti con foto e prezzi sulla scheda: 1 con Free, 10 con Silver, 100 con Gold.",
    anchor: "scheda",
    minPlan: "free",
  },
];

/** Funzioni del portale, con il piano minimo che le attiva. */
export type Funzione = {
  label: string;
  descr: string;
  minPlan: Plan;
};

export const FUNZIONI: Funzione[] = [
  { label: "Segnaposto sulla mappa", descr: "Ti trovano i consumatori vicino a te (km0).", minPlan: "free" },
  { label: "Telefono e categoria visibili", descr: "Chi ti cerca può contattarti.", minPlan: "free" },
  { label: "Un prodotto col semaforo", descr: "La prima scheda con semaforo di sostenibilità.", minPlan: "free" },
  { label: "Scheda con URL personale", descr: "Un indirizzo tuo, da condividere con chiunque.", minPlan: "silver" },
  { label: "Una foto della tua azienda", descr: "Scheda più ricca, segnaposto più grande.", minPlan: "silver" },
  { label: "Descrizione, sito web e contatti", descr: "Racconta chi sei, con link al tuo sito.", minPlan: "silver" },
  { label: "Fino a 10 prodotti col semaforo", descr: "Più prodotti con foto sulla tua scheda.", minPlan: "silver" },
  { label: "Attività extra prenotabile", descr: "Prenotabile dalla tua scheda cliente personalizzata.", minPlan: "silver" },
  { label: "Priorità nei risultati della zona", descr: "Sali nelle ricerche vicino a te.", minPlan: "silver" },
  { label: "Statistiche base", descr: "Quante visite riceve la tua scheda.", minPlan: "silver" },
  { label: "Negozio online", descr: "Prodotti e servizi acquistabili da chiunque, con URL dedicata.", minPlan: "gold" },
  { label: "Fino a 100 prodotti o servizi extra", descr: "Sblocchi il «+» per caricarne fino a 100.", minPlan: "gold" },
  { label: "In evidenza sulla mappa", descr: "La tua attività risalta in cima alla zona.", minPlan: "gold" },
  { label: "Esperienze prenotabili illimitate", descr: "Con Gold; con Silver 1 esperienza.", minPlan: "gold" },
  { label: "Statistiche avanzate", descr: "Andamento nel tempo e area geografica.", minPlan: "gold" },
];
