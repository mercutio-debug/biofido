import type { MateriaPrima } from "./biofido-data";

/**
 * Impronta ecologica di trasporto di un prodotto: somma le distanze delle
 * materie prime dal loro luogo d'origine alla sede (stabilimento), con un
 * fattore strada, e ne ricava una stima di CO₂ e un semaforo.
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

export type Impronta = {
  totalKm: number;
  co2Kg: number;
  level: "verde" | "giallo" | "rosso";
  /** materie prime valide (con coordinate) usate nel calcolo */
  conteggio: number;
};

export function calcolaImpronta(
  sede: { lat: number; lon: number } | null,
  ingredienti: MateriaPrima[],
): Impronta {
  if (!sede) return { totalKm: 0, co2Kg: 0, level: "verde", conteggio: 0 };
  let totalKm = 0;
  let n = 0;
  for (const i of ingredienti) {
    if (typeof i.lat !== "number" || typeof i.lon !== "number") continue;
    totalKm += haversineKm(sede.lat, sede.lon, i.lat, i.lon) * ROAD_FACTOR;
    n++;
  }
  const avg = n ? totalKm / n : 0;
  // criterio condiviso con ECO-VISA: distanza media ≤200 km verde, ≤700 giallo, oltre rosso
  const level = avg <= 200 ? "verde" : avg <= 700 ? "giallo" : "rosso";
  return {
    totalKm: Math.round(totalKm),
    co2Kg: Math.round(totalKm * CO2_KG_PER_KM),
    level,
    conteggio: n,
  };
}

export const SEMAFORO = {
  verde: { colore: "#639922", testo: "Impronta ottima — filiera corta" },
  giallo: { colore: "#EF9F27", testo: "Impronta media — distanze moderate" },
  rosso: { colore: "#E24B4A", testo: "Impronta alta — materie prime lontane" },
} as const;
