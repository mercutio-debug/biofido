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

export type PlanInfo = {
  id: Plan;
  label: string;
  /** dimensione del segnaposto sulla mappa, in pixel */
  markerSize: number;
  /** mostra la categoria nel segnaposto (icona grande) */
  showIcon: boolean;
  /** può caricare foto e prezzi dei prodotti */
  showProducts: boolean;
  /** ordine di priorità nella lista (più alto = più in alto) */
  priority: number;
};

export const PLAN_MAP: Record<Plan, PlanInfo> = {
  free: { id: "free", label: "Gratuito", markerSize: 26, showIcon: false, showProducts: false, priority: 0 },
  silver: { id: "silver", label: "Silver", markerSize: 38, showIcon: true, showProducts: false, priority: 1 },
  gold: { id: "gold", label: "Gold", markerSize: 50, showIcon: true, showProducts: true, priority: 2 },
};
