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
    descr: "Prodotti con foto e prezzi sulla scheda: 10 con Silver, 100 con Gold.",
    anchor: "scheda",
    minPlan: "silver",
  },
];

/** Funzioni del portale, con il piano minimo che le attiva. */
export type Funzione = {
  label: string;
  descr: string;
  minPlan: Plan;
};

export const FUNZIONI: Funzione[] = [
  { label: "Segnaposto sulla mappa", descr: "Visibile a chi cerca vicino a te.", minPlan: "free" },
  { label: "Telefono visibile", descr: "Chi ti trova può chiamarti.", minPlan: "free" },
  { label: "Categoria e città", descr: "La tua attività ben classificata.", minPlan: "free" },
  { label: "Descrizione e storia", descr: "Racconta chi sei e cosa fai.", minPlan: "silver" },
  { label: "Sito web e contatti estesi", descr: "Link al tuo sito sulla scheda.", minPlan: "silver" },
  { label: "Galleria foto", descr: "Fino a 3 foto della tua attività.", minPlan: "silver" },
  { label: "Segnaposto più grande con icona", descr: "Più visibile sulla mappa.", minPlan: "silver" },
  { label: "Priorità nei risultati", descr: "Sali nelle ricerche della tua zona.", minPlan: "silver" },
  { label: "Esperienze prenotabili", descr: "1 con Silver, illimitate con Gold.", minPlan: "silver" },
  { label: "Vendita e pagamenti online", descr: "Incassa le prenotazioni (commissione del piano).", minPlan: "silver" },
  { label: "Statistiche di traffico", descr: "Base (Silver) o avanzate (Gold).", minPlan: "silver" },
  { label: "Prodotti con foto e prezzi", descr: "Fino a 10 (Silver) o 100 (Gold), con foto e prezzi.", minPlan: "silver" },
  { label: "Video di presentazione", descr: "Un video nella tua scheda.", minPlan: "gold" },
  { label: "In evidenza nella zona", descr: "Slot in cima alla mappa della zona.", minPlan: "gold" },
  { label: "Esperienze illimitate", descr: "Con Gold; con Silver 1 esperienza.", minPlan: "gold" },
];
