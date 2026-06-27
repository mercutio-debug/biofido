import type { MateriaPrima } from "./biofido-data";

/**
 * Impronta di trasporto di un prodotto. Criterio CONDIVISO con ECO-VISA:
 * scala a 8 tonalità (distanza + geografia) e GIUDIZIO a punteggio pesato
 * (non la somma), così i prodotti con tanti ingredienti non sono penalizzati e
 * un singolo ingrediente esotico non rovina tutto.
 */
const R = 6371; // raggio terrestre (km)
const ROAD_FACTOR = 1.3; // la strada è più lunga della linea d'aria
const SAME_TOWN_KM = 5; // entro ~5 km in linea d'aria = stesso comune → km0, 0 CO₂
const CO2_KG_PER_KM = 0.8; // camion in Europa, ~800 g CO₂/km (come ECO-VISA)
const SHIP_KG_PER_KM = 0.03; // nave per l'extra-UE, ~30 g CO₂/km (come ECO-VISA)
// porto italiano di sbarco di riferimento per le merci extra-UE
const PORTO_RIF = { lat: 44.41, lon: 8.93 }; // Genova

function viaCamion(lat: number, lon: number): boolean {
  const europa = lat >= 34 && lat <= 72 && lon >= -25 && lon <= 45;
  const nordAfrica = lat >= 19 && lat < 37 && lon >= -17 && lon <= 33;
  return europa || nordAfrica;
}

/** Macro-regione di provenienza (da lat/lon, le materie prime non hanno country). */
export type Regione = "italia" | "europa" | "america_africa" | "asia" | "oceania";

export function regioneDi(lat: number, lon: number): Regione {
  // bounding box approssimativo dell'Italia (isole comprese)
  const inItalia = lat >= 35.3 && lat <= 47.1 && lon >= 6.5 && lon <= 18.6;
  if (inItalia) return "italia";
  if (lat < -10 && lon >= 110) return "oceania"; // Australia, Nuova Zelanda, Pacifico
  if (lon > 45) return "asia";
  if (lon < -25) return "america_africa";
  if (lat < 34) return "america_africa"; // Africa
  return "europa";
}

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/* Scala a 9 tonalità (3 verdi · 3 gialli · 3 rossi), per ingrediente E per prodotto. */
export type TierIng =
  | "super_green"
  | "verde"
  | "verde_chiaro"
  | "giallo_chiaro"
  | "giallo"
  | "giallo_scuro"
  | "rosso_chiaro"
  | "rosso_scuro"
  | "rosso_scurissimo";

/** Il prodotto è giudicato sulla stessa scala a 9 tonalità. */
export type Giudizio = TierIng;

/** Tonalità di una materia prima in base a distanza (km) + regione.
 *  Verde fino a 400 km; i 3 gialli per pura distanza (1000–2000 km);
 *  i 3 rossi oltre 2000 km, distinti per geografia. */
export function tierIngrediente(km: number, reg: Regione): TierIng {
  if (km <= 70) return "super_green";
  if (km <= 400) return "verde";
  if (km <= 1000) return "verde_chiaro";
  if (km <= 1300) return "giallo_chiaro";
  if (km <= 1600) return "giallo";
  if (km <= 2000) return "giallo_scuro";
  if (reg === "asia" || reg === "oceania") return "rosso_scurissimo";
  if (reg === "america_africa") return "rosso_scuro";
  return "rosso_chiaro";
}

/* Equazione: ogni ingrediente vale un punteggio qualità; il prodotto è la media,
   con FRENO DURO (un solo rosso scurissimo → mai oltre il giallo scuro). */
const QUALITA: Record<TierIng, number> = {
  super_green: 100,
  verde: 92,
  verde_chiaro: 82,
  giallo_chiaro: 65,
  giallo: 55,
  giallo_scuro: 45,
  rosso_chiaro: 34,
  rosso_scuro: 24,
  rosso_scurissimo: 8,
};

function bandaDaPunteggio(score: number): Giudizio {
  if (score >= 95) return "super_green";
  if (score >= 86) return "verde";
  if (score >= 72) return "verde_chiaro";
  if (score >= 60) return "giallo_chiaro";
  if (score >= 50) return "giallo";
  if (score >= 40) return "giallo_scuro";
  if (score >= 30) return "rosso_chiaro";
  if (score >= 16) return "rosso_scuro";
  return "rosso_scurissimo";
}

export function giudizioProdotto(tiers: TierIng[]): { level: Giudizio; score: number } {
  if (!tiers.length) return { level: "verde_chiaro", score: 82 };
  let score = Math.round(tiers.reduce((s, t) => s + QUALITA[t], 0) / tiers.length);
  if (tiers.includes("rosso_scurissimo")) score = Math.min(score, 49);
  return { level: bandaDaPunteggio(score), score };
}

function categoriaDi(t: TierIng): "verde" | "giallo" | "rosso" {
  if (t === "super_green" || t === "verde" || t === "verde_chiaro") return "verde";
  if (t === "giallo_chiaro" || t === "giallo" || t === "giallo_scuro") return "giallo";
  return "rosso";
}

/** Consigli contestuali per le materie prime lontane (giallo/rosso). */
export function consigliIngredienti(ings: { nome: string; tier: TierIng }[]): string[] {
  const out: string[] = [];
  for (const i of ings) {
    if (categoriaDi(i.tier) === "verde") continue;
    const n = (i.nome || "").toLowerCase();
    if (n.includes("zucchero di canna") || n.includes("canna")) {
      out.push(
        "È vero, lo zucchero di canna di solito arriva da lontano — perché non provare dolcificanti locali come malto d'orzo, miele o zucchero di barbabietola grezzo?",
      );
    } else if (n.includes("cacao") || n.includes("cioccolat") || n.includes("caffè") || n.includes("caffe") || n.includes("vaniglia") || n.includes("spezie") || n.includes("pepe")) {
      out.push(
        `«${i.nome}» arriva per natura da lontano: difficile sostituirlo, ma sceglierlo da filiere certificate e a basso impatto fa la differenza.`,
      );
    } else {
      out.push(
        `«${i.nome}» arriva da lontano: dove possibile, una materia prima più vicina migliorerebbe il semaforo.`,
      );
    }
  }
  return [...new Set(out)].slice(0, 3);
}

export type Impronta = {
  totalKm: number;
  co2Kg: number;
  level: Giudizio;
  score: number;
  /** materie prime valide (con coordinate) usate nel calcolo */
  conteggio: number;
  /** tonalità di ogni materia prima valida, nell'ordine */
  tiers: TierIng[];
  /** dettaglio per materia prima valida: nome, tonalità e km percorsi */
  dettaglio: { nome: string; tier: TierIng; km: number }[];
  /** suggerimenti contestuali per le materie prime lontane */
  consigli: string[];
};

export function calcolaImpronta(
  sede: { lat: number; lon: number } | null,
  ingredienti: MateriaPrima[],
): Impronta {
  if (!sede)
    return { totalKm: 0, co2Kg: 0, level: "verde_chiaro", score: 82, conteggio: 0, tiers: [], dettaglio: [], consigli: [] };
  let totalKm = 0;
  let co2Kg = 0;
  const tiers: TierIng[] = [];
  const validi: { nome: string; tier: TierIng; km: number }[] = [];
  for (const i of ingredienti) {
    if (typeof i.lat !== "number" || typeof i.lon !== "number") continue;
    let km: number;
    let co2: number;
    const dir = haversineKm(sede.lat, sede.lon, i.lat, i.lon);
    if (dir < SAME_TOWN_KM) {
      // materia prima nello stesso comune/località dello stabilimento: trasporto
      // trascurabile → 0 km, 0 CO₂ (così non risulta "1 km" per il km0).
      km = 0;
      co2 = 0;
    } else if (viaCamion(i.lat, i.lon)) {
      km = dir * ROAD_FACTOR;
      co2 = km * CO2_KG_PER_KM;
    } else {
      const mare = haversineKm(i.lat, i.lon, PORTO_RIF.lat, PORTO_RIF.lon);
      const gomma =
        haversineKm(PORTO_RIF.lat, PORTO_RIF.lon, sede.lat, sede.lon) * ROAD_FACTOR;
      km = mare + gomma;
      co2 = mare * SHIP_KG_PER_KM + gomma * CO2_KG_PER_KM;
    }
    totalKm += km;
    co2Kg += co2;
    const t = tierIngrediente(km, regioneDi(i.lat, i.lon));
    tiers.push(t);
    validi.push({ nome: i.nome, tier: t, km: Math.round(km) });
  }
  const { level, score } = giudizioProdotto(tiers);
  return {
    totalKm: Math.round(totalKm),
    co2Kg: Math.round(co2Kg),
    level,
    score,
    conteggio: tiers.length,
    tiers,
    dettaglio: validi,
    consigli: consigliIngredienti(validi),
  };
}

export const SEMAFORO: Record<Giudizio, { colore: string; testo: string; label: string }> = {
  super_green: { colore: "#2e9e0e", label: "Super Green", testo: "Super Green — materie prime a km0 / locali" },
  verde: { colore: "#45a82f", label: "Verde", testo: "Verde — entro 400 km, filiera corta" },
  verde_chiaro: { colore: "#7cb342", label: "Verde chiaro", testo: "Verde chiaro — entro 1000 km" },
  giallo_chiaro: { colore: "#f6c416", label: "Giallo chiaro", testo: "Giallo chiaro — 1000–1300 km" },
  giallo: { colore: "#e7af0b", label: "Giallo", testo: "Giallo — 1300–1600 km" },
  giallo_scuro: { colore: "#d99a00", label: "Giallo scuro", testo: "Giallo scuro — 1600–2000 km" },
  rosso_chiaro: { colore: "#ef5350", label: "Rosso chiaro", testo: "Rosso chiaro — oltre 2000 km, in Europa" },
  rosso_scuro: { colore: "#c62828", label: "Rosso scuro", testo: "Rosso scuro — oltre 2000 km (America/Africa)" },
  rosso_scurissimo: { colore: "#9c0604", label: "Rosso scurissimo", testo: "Rosso scurissimo — Asia / Oceania" },
};
