import type { MateriaPrima } from "./biofido-data";

/**
 * Impronta di trasporto di un prodotto. Criterio CONDIVISO con ECO-VISA:
 * ogni materia prima prende un colore in base alla distanza dalla sede, e il
 * semaforo grande è un GIUDIZIO PROPORZIONALE (non la somma), così i prodotti
 * con tanti ingredienti non sono penalizzati.
 */
const R = 6371; // raggio terrestre (km)
const ROAD_FACTOR = 1.3; // la strada è più lunga della linea d'aria
const CO2_KG_PER_KM = 0.8; // camion in Europa, ~800 g CO₂/km (come ECO-VISA)

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type TierIng =
  | "km0"
  | "verde_intenso"
  | "verde_chiaro"
  | "verde_pallido"
  | "giallo"
  | "rosso";

export type Giudizio =
  | "verde_plus"
  | "verde"
  | "verde_chiaro"
  | "giallo"
  | "rosso"
  | "rosso_intenso";

type Categoria = "verde" | "giallo" | "rosso";

/** Colore di una materia prima in base alla distanza (km). */
export function tierIngrediente(km: number): TierIng {
  if (km <= 70) return "km0";
  if (km <= 200) return "verde_intenso";
  if (km <= 500) return "verde_chiaro";
  if (km <= 1000) return "verde_pallido";
  if (km <= 2000) return "giallo";
  return "rosso";
}

function categoriaDi(t: TierIng): Categoria {
  if (t === "giallo") return "giallo";
  if (t === "rosso") return "rosso";
  return "verde";
}

/** Giudizio proporzionale del semaforo grande. */
export function giudizioDaCategorie(cats: Categoria[]): Giudizio {
  const n = cats.length;
  if (n === 0) return "verde";
  const g = cats.filter((c) => c === "verde").length;
  const r = cats.filter((c) => c === "rosso").length;
  if (r === n) return "rosso_intenso";
  if (r * 2 >= n) return "rosso";
  if (r >= 1) return "giallo";
  if (g === n) return "verde_plus";
  if (g * 2 > n) return "verde";
  if (g * 2 === n) return "verde_chiaro";
  return "giallo";
}

export type Impronta = {
  totalKm: number;
  co2Kg: number;
  level: Giudizio;
  /** materie prime valide (con coordinate) usate nel calcolo */
  conteggio: number;
  /** colore di ogni materia prima valida, nell'ordine */
  tiers: TierIng[];
};

export function calcolaImpronta(
  sede: { lat: number; lon: number } | null,
  ingredienti: MateriaPrima[],
): Impronta {
  if (!sede) return { totalKm: 0, co2Kg: 0, level: "verde", conteggio: 0, tiers: [] };
  let totalKm = 0;
  const tiers: TierIng[] = [];
  const cats: Categoria[] = [];
  for (const i of ingredienti) {
    if (typeof i.lat !== "number" || typeof i.lon !== "number") continue;
    const km = haversineKm(sede.lat, sede.lon, i.lat, i.lon) * ROAD_FACTOR;
    totalKm += km;
    const t = tierIngrediente(km);
    tiers.push(t);
    cats.push(categoriaDi(t));
  }
  return {
    totalKm: Math.round(totalKm),
    co2Kg: Math.round(totalKm * CO2_KG_PER_KM),
    level: giudizioDaCategorie(cats),
    conteggio: cats.length,
    tiers,
  };
}

export const SEMAFORO: Record<Giudizio, { colore: string; testo: string }> = {
  verde_plus: { colore: "#2e9e0e", testo: "Super Green — materie prime a km0 / locali" },
  verde: { colore: "#639922", testo: "Sostenibile — filiera corta" },
  verde_chiaro: { colore: "#7cb342", testo: "Buono — distanze contenute" },
  giallo: { colore: "#EF9F27", testo: "Migliorabile — alcune materie prime lontane" },
  rosso: { colore: "#E24B4A", testo: "Alto impatto — materie prime lontane" },
  rosso_intenso: { colore: "#b71c1c", testo: "Filiera lunga — materie prime molto lontane" },
};
