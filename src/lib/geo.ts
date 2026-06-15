/**
 * Mini "geolocalizzatore" offline per ECO-VISA.
 * Contiene un dizionario di località (città, regioni, paesi, porti) con
 * coordinate. Calcola le distanze con la formula dell'emisenoverso (Haversine)
 * e simula il collegamento a un geolocalizzatore come da progetto.
 *
 * In produzione questo modulo si può sostituire con una chiamata reale a
 * Google Maps / OpenStreetMap Nominatim mantenendo la stessa interfaccia.
 */

export type GeoPoint = {
  name: string;
  lat: number;
  lon: number;
  country: string;
  /** appartiene all'Unione Europea? */
  eu: boolean;
  /** è un porto marittimo? */
  port?: boolean;
};

/** fattore di correzione strada: la distanza su gomma è > della linea d'aria */
export const ROAD_FACTOR = 1.3;

const DB: Record<string, GeoPoint> = {};
function add(p: GeoPoint, aliases: string[] = []) {
  const key = norm(p.name);
  DB[key] = p;
  for (const a of aliases) DB[norm(a)] = p;
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---- Italia: città ----
add({ name: "Cuneo", lat: 44.39, lon: 7.55, country: "Italia", eu: true });
add({ name: "Torino", lat: 45.07, lon: 7.69, country: "Italia", eu: true });
add({ name: "Milano", lat: 45.46, lon: 9.19, country: "Italia", eu: true });
add({ name: "Genova", lat: 44.41, lon: 8.93, country: "Italia", eu: true, port: true });
add({ name: "Savona", lat: 44.31, lon: 8.48, country: "Italia", eu: true, port: true });
add({ name: "Bologna", lat: 44.49, lon: 11.34, country: "Italia", eu: true });
add({ name: "Firenze", lat: 43.77, lon: 11.26, country: "Italia", eu: true });
add({ name: "Siena", lat: 43.32, lon: 11.33, country: "Italia", eu: true }, ["toscana"]);
add({ name: "Livorno", lat: 43.55, lon: 10.31, country: "Italia", eu: true, port: true });
add({ name: "Roma", lat: 41.9, lon: 12.5, country: "Italia", eu: true, port: true }, ["lazio"]);
add({ name: "Napoli", lat: 40.85, lon: 14.27, country: "Italia", eu: true, port: true }, ["campania"]);
add({ name: "Bari", lat: 41.12, lon: 16.87, country: "Italia", eu: true, port: true }, ["puglia"]);
add({ name: "Lecce", lat: 40.35, lon: 18.17, country: "Italia", eu: true });
add({ name: "Palermo", lat: 38.12, lon: 13.36, country: "Italia", eu: true, port: true }, ["sicilia"]);
add({ name: "Gioia Tauro", lat: 38.43, lon: 15.9, country: "Italia", eu: true, port: true });
add({ name: "Cagliari", lat: 39.22, lon: 9.12, country: "Italia", eu: true, port: true }, ["sardegna"]);
add({ name: "Venezia", lat: 45.44, lon: 12.32, country: "Italia", eu: true, port: true }, ["veneto"]);
add({ name: "Trieste", lat: 45.65, lon: 13.78, country: "Italia", eu: true, port: true });
add({ name: "Verona", lat: 45.44, lon: 10.99, country: "Italia", eu: true });
add({ name: "Parma", lat: 44.8, lon: 10.33, country: "Italia", eu: true }, ["emilia romagna", "emilia"]);
add({ name: "Perugia", lat: 43.11, lon: 12.39, country: "Italia", eu: true }, ["umbria"]);
add({ name: "Ancona", lat: 43.62, lon: 13.52, country: "Italia", eu: true, port: true }, ["marche"]);
add({ name: "Pescara", lat: 42.46, lon: 14.21, country: "Italia", eu: true }, ["abruzzo"]);
add({ name: "Catania", lat: 37.5, lon: 15.09, country: "Italia", eu: true, port: true });
add({ name: "Reggio Calabria", lat: 38.11, lon: 15.65, country: "Italia", eu: true }, ["calabria"]);
add({ name: "Aosta", lat: 45.74, lon: 7.32, country: "Italia", eu: true }, ["valle d aosta"]);
add({ name: "Trento", lat: 46.07, lon: 11.12, country: "Italia", eu: true }, ["trentino"]);
add({ name: "Potenza", lat: 40.64, lon: 15.81, country: "Italia", eu: true }, ["basilicata"]);
add({ name: "Campobasso", lat: 41.56, lon: 14.66, country: "Italia", eu: true }, ["molise"]);

// ---- Europa (UE) ----
add({ name: "Bucarest", lat: 44.43, lon: 26.1, country: "Romania", eu: true }, ["bucharest", "romania"]);
add({ name: "Parigi", lat: 48.85, lon: 2.35, country: "Francia", eu: true }, ["francia", "paris"]);
add({ name: "Madrid", lat: 40.42, lon: -3.7, country: "Spagna", eu: true }, ["spagna"]);
add({ name: "Berlino", lat: 52.52, lon: 13.4, country: "Germania", eu: true }, ["germania", "berlin"]);
add({ name: "Atene", lat: 37.98, lon: 23.73, country: "Grecia", eu: true }, ["grecia"]);
add({ name: "Lisbona", lat: 38.72, lon: -9.14, country: "Portogallo", eu: true }, ["portogallo"]);
add({ name: "Vienna", lat: 48.21, lon: 16.37, country: "Austria", eu: true }, ["austria"]);
add({ name: "Varsavia", lat: 52.23, lon: 21.01, country: "Polonia", eu: true }, ["polonia"]);
add({ name: "Amsterdam", lat: 52.37, lon: 4.9, country: "Paesi Bassi", eu: true, port: true }, ["olanda", "paesi bassi"]);

// ---- Extra UE ----
add({ name: "San Paolo", lat: -23.55, lon: -46.63, country: "Brasile", eu: false, port: true }, ["brasile", "sao paulo", "san paolo del brasile"]);
add({ name: "Buenos Aires", lat: -34.6, lon: -58.38, country: "Argentina", eu: false, port: true }, ["argentina"]);
add({ name: "Casablanca", lat: 33.57, lon: -7.59, country: "Marocco", eu: false, port: true }, ["marocco"]);
add({ name: "Il Cairo", lat: 30.04, lon: 31.24, country: "Egitto", eu: false, port: true }, ["egitto", "cairo"]);
add({ name: "Istanbul", lat: 41.01, lon: 28.98, country: "Turchia", eu: false, port: true }, ["turchia"]);
add({ name: "Mumbai", lat: 19.08, lon: 72.88, country: "India", eu: false, port: true }, ["india"]);
add({ name: "Shanghai", lat: 31.23, lon: 121.47, country: "Cina", eu: false, port: true }, ["cina", "china"]);
add({ name: "Bangkok", lat: 13.76, lon: 100.5, country: "Thailandia", eu: false, port: true }, ["thailandia"]);
add({ name: "Città del Messico", lat: 19.43, lon: -99.13, country: "Messico", eu: false }, ["messico"]);
add({ name: "New York", lat: 40.71, lon: -74.0, country: "USA", eu: false, port: true }, ["usa", "stati uniti"]);
add({ name: "Nairobi", lat: -1.29, lon: 36.82, country: "Kenya", eu: false }, ["kenya"]);
add({ name: "Londra", lat: 51.51, lon: -0.13, country: "Regno Unito", eu: false, port: true }, ["regno unito", "uk", "inghilterra", "london"]);

/** porti italiani usati come punto di sbarco merci extra-UE */
const IT_PORTS = Object.values(DB).filter((p) => p.country === "Italia" && p.port);
// dedup
const seen = new Set<string>();
const ITALIAN_PORTS = IT_PORTS.filter((p) => {
  const k = p.name;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** cerca una località per nome (case/accent-insensitive). null se sconosciuta. */
export function geocode(name: string): GeoPoint | null {
  if (!name) return null;
  const k = norm(name);
  if (DB[k]) return DB[k];
  // match parziale: "siena (toscana)" o "burro romania"
  const found = Object.keys(DB).find((key) => k.includes(key) || key.includes(k));
  return found ? DB[found] : null;
}

/** porto italiano più vicino allo stabilimento (per merci via nave) */
export function nearestItalianPort(to: GeoPoint): GeoPoint {
  let best = ITALIAN_PORTS[0];
  let bestD = Infinity;
  for (const p of ITALIAN_PORTS) {
    const d = haversineKm(p, to);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

/** località conosciuta più vicina a coordinate (per la geolocalizzazione browser) */
export function nearestPlace(lat: number, lon: number): GeoPoint {
  const probe: GeoPoint = { name: "", lat, lon, country: "", eu: true };
  let best = Object.values(DB)[0];
  let bestD = Infinity;
  for (const p of Object.values(DB)) {
    const d = haversineKm(p, probe);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

/** elenco completo per autocomplete nei form */
export function allPlaceNames(): string[] {
  const names = new Set(Object.values(DB).map((p) => p.name));
  return [...names].sort((a, b) => a.localeCompare(b, "it"));
}
