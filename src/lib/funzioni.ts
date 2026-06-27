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

/** Funzioni del portale, con il piano minimo che le attiva.
 *  `info` = spiegazione estesa (ripresa dalla presentazione del portale), mostrata
 *  cliccando il «?» di fianco alla funzione. */
export type Funzione = {
  label: string;
  descr: string;
  minPlan: Plan;
  info?: string;
};

export const FUNZIONI: Funzione[] = [
  { label: "Segnaposto sulla mappa", descr: "Ti trovano i consumatori vicino a te (km0).", minPlan: "free",
    info: "La tua azienda compare come pin sulla mappa: i consumatori della tua zona ti trovano cercando prodotti a km0. È il primo passo per farti conoscere localmente, gratis." },
  { label: "Categoria visibile", descr: "La tua attività ben classificata sulla mappa.", minPlan: "free",
    info: "Categoria merceologica e città sono visibili a chi apre la tua scheda: ti trovano e ti raggiungono subito." },
  { label: "Un prodotto col semaforo", descr: "La prima scheda con semaforo di sostenibilità.", minPlan: "free",
    info: "Carichi un prodotto e ottieni il suo semaforo di sostenibilità (calcolato dalle materie prime e dalla loro origine): è l'elemento che distingue ECO-VISA e BioFido da qualsiasi altra vetrina." },
  { label: "Scheda con URL personale", descr: "Un indirizzo tuo, da condividere con chiunque.", minPlan: "silver",
    info: "Ricevi un indirizzo web tutto tuo (es. /azienda/la-tua-azienda) da mettere sui social, sui biglietti da visita e ovunque: è la tua scheda pubblica condivisibile e indicizzata sui motori di ricerca." },
  { label: "Una foto della tua azienda", descr: "Scheda più ricca, segnaposto più grande.", minPlan: "silver",
    info: "Aggiungi la foto di copertina dell'azienda: la scheda diventa più ricca e il tuo segnaposto sulla mappa più grande e riconoscibile." },
  { label: "Descrizione e sito web", descr: "Racconta chi sei, con link al tuo sito.", minPlan: "silver",
    info: "Racconti la storia e i valori della tua attività, con descrizione estesa e link al sito: i clienti scelgono chi conoscono." },
  { label: "Fino a 10 prodotti col semaforo", descr: "Più prodotti con foto sulla tua scheda.", minPlan: "silver",
    info: "Pubblichi fino a 10 prodotti, ciascuno con la sua foto e il suo semaforo di sostenibilità: una vera vetrina, non un solo prodotto." },
  { label: "Attività extra prenotabile", descr: "Prenotabile dalla tua scheda cliente personalizzata.", minPlan: "silver",
    info: "Offri un'attività in azienda — una visita, una degustazione, un laboratorio — prenotabile direttamente dalla tua scheda dai clienti, senza telefonate." },
  { label: "Priorità nei risultati della zona", descr: "Sali nelle ricerche vicino a te.", minPlan: "silver",
    info: "Nelle ricerche della tua zona compari più in alto rispetto alle attività Free: più visibilità dove conta, vicino a te." },
  { label: "Statistiche base", descr: "Quante visite riceve la tua scheda.", minPlan: "silver",
    info: "Vedi quante persone hanno aperto la tua scheda: capisci se la tua vetrina sta funzionando." },
  { label: "Negozio online", descr: "Prodotti e servizi acquistabili da chiunque, con URL dedicata.", minPlan: "gold",
    info: "La tua scheda diventa un vero negozio online: i clienti acquistano prodotti e servizi direttamente, con pagamento sicuro. Vale come un sito e-commerce personale, a una frazione del costo." },
  { label: "Magazzino intelligente", descr: "Le giacenze si aggiornano da sole e ti avvisano.", minPlan: "gold",
    info: "Imposti la quantità disponibile di ogni prodotto: a ogni ordine il magazzino si scala da solo e ti avvisa quando un prodotto è a metà, a un terzo o esaurito. Niente più vendite di ciò che non hai." },
  { label: "Fino a 100 prodotti o servizi extra", descr: "Sblocchi il «+» per caricarne fino a 100.", minPlan: "gold",
    info: "Carichi fino a 100 tra prodotti e servizi extra: spazio per tutto il tuo catalogo, con foto e prezzi." },
  { label: "In evidenza sulla mappa", descr: "La tua attività risalta in cima alla zona.", minPlan: "gold",
    info: "Slot «in evidenza»: la tua attività risalta in cima alla mappa della tua zona, davanti a tutte le altre." },
  { label: "Esperienze prenotabili illimitate", descr: "Con Gold; con Silver 1 esperienza.", minPlan: "gold",
    info: "Pubblichi tutte le esperienze prenotabili che vuoi (visite, corsi, degustazioni), senza il limite di una sola del piano Silver." },
  { label: "Statistiche avanzate", descr: "Andamento nel tempo e area geografica.", minPlan: "gold",
    info: "Oltre al conteggio visite: andamento nel tempo, provenienza geografica dei visitatori e prodotti più visti. Capisci chi ti cerca e da dove." },
];
