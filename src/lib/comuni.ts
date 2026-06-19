/**
 * Comuni italiani per l'autocomplete geolocalizzato (sede e origine materie
 * prime). I dati stanno in public/comuni.json come array compatto
 * [nome, provincia, regione, lat, lon] e si caricano una sola volta su richiesta.
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export type Comune = {
  nome: string;
  prov: string;
  regione: string;
  lat: number;
  lon: number;
};

type Row = [string, string, string, number, number];

/**
 * Origini ESTERE selezionabili oltre ai comuni italiani: così una materia prima
 * che arriva da fuori Italia prende comunque le coordinate e rientra nel calcolo
 * dell'impronta (prima, non essendo selezionabile, veniva ignorata).
 * Coordinate = città principale del Paese; la regione indica UE / extra-UE.
 */
export const ESTERI: Comune[] = [
  // --- Unione Europea (27) — trasporto su gomma ---
  { nome: "Austria", prov: "AT", regione: "Estero · UE", lat: 48.21, lon: 16.37 },
  { nome: "Belgio", prov: "BE", regione: "Estero · UE", lat: 50.85, lon: 4.35 },
  { nome: "Bulgaria", prov: "BG", regione: "Estero · UE", lat: 42.7, lon: 23.32 },
  { nome: "Cipro", prov: "CY", regione: "Estero · UE", lat: 35.17, lon: 33.36 },
  { nome: "Croazia", prov: "HR", regione: "Estero · UE", lat: 45.81, lon: 15.98 },
  { nome: "Danimarca", prov: "DK", regione: "Estero · UE", lat: 55.68, lon: 12.57 },
  { nome: "Estonia", prov: "EE", regione: "Estero · UE", lat: 59.44, lon: 24.75 },
  { nome: "Finlandia", prov: "FI", regione: "Estero · UE", lat: 60.17, lon: 24.94 },
  { nome: "Francia", prov: "FR", regione: "Estero · UE", lat: 48.85, lon: 2.35 },
  { nome: "Germania", prov: "DE", regione: "Estero · UE", lat: 52.52, lon: 13.4 },
  { nome: "Grecia", prov: "GR", regione: "Estero · UE", lat: 37.98, lon: 23.73 },
  { nome: "Irlanda", prov: "IE", regione: "Estero · UE", lat: 53.35, lon: -6.26 },
  { nome: "Lettonia", prov: "LV", regione: "Estero · UE", lat: 56.95, lon: 24.11 },
  { nome: "Lituania", prov: "LT", regione: "Estero · UE", lat: 54.69, lon: 25.28 },
  { nome: "Lussemburgo", prov: "LU", regione: "Estero · UE", lat: 49.61, lon: 6.13 },
  { nome: "Malta", prov: "MT", regione: "Estero · UE", lat: 35.9, lon: 14.51 },
  { nome: "Paesi Bassi", prov: "NL", regione: "Estero · UE", lat: 52.37, lon: 4.9 },
  { nome: "Polonia", prov: "PL", regione: "Estero · UE", lat: 52.23, lon: 21.01 },
  { nome: "Portogallo", prov: "PT", regione: "Estero · UE", lat: 38.72, lon: -9.14 },
  { nome: "Repubblica Ceca", prov: "CZ", regione: "Estero · UE", lat: 50.08, lon: 14.44 },
  { nome: "Romania", prov: "RO", regione: "Estero · UE", lat: 44.43, lon: 26.1 },
  { nome: "Slovacchia", prov: "SK", regione: "Estero · UE", lat: 48.15, lon: 17.11 },
  { nome: "Slovenia", prov: "SI", regione: "Estero · UE", lat: 46.05, lon: 14.51 },
  { nome: "Spagna", prov: "ES", regione: "Estero · UE", lat: 40.42, lon: -3.7 },
  { nome: "Svezia", prov: "SE", regione: "Estero · UE", lat: 59.33, lon: 18.06 },
  { nome: "Ungheria", prov: "HU", regione: "Estero · UE", lat: 47.5, lon: 19.04 },
  // --- Resto d'Europa (non UE) — su gomma ---
  { nome: "Regno Unito", prov: "GB", regione: "Estero · Europa", lat: 51.51, lon: -0.13 },
  { nome: "Svizzera", prov: "CH", regione: "Estero · Europa", lat: 46.95, lon: 7.45 },
  { nome: "Norvegia", prov: "NO", regione: "Estero · Europa", lat: 59.91, lon: 10.75 },
  { nome: "Serbia", prov: "RS", regione: "Estero · Europa", lat: 44.79, lon: 20.45 },
  { nome: "Albania", prov: "AL", regione: "Estero · Europa", lat: 41.33, lon: 19.82 },
  // --- Extra-UE — trasporto via nave + camion dal porto ---
  { nome: "Turchia", prov: "TR", regione: "Estero · extra-UE", lat: 41.01, lon: 28.98 },
  { nome: "Marocco", prov: "MA", regione: "Estero · extra-UE", lat: 33.57, lon: -7.59 },
  { nome: "Tunisia", prov: "TN", regione: "Estero · extra-UE", lat: 36.81, lon: 10.18 },
  { nome: "Algeria", prov: "DZ", regione: "Estero · extra-UE", lat: 36.75, lon: 3.06 },
  { nome: "Egitto", prov: "EG", regione: "Estero · extra-UE", lat: 30.04, lon: 31.24 },
  { nome: "Israele", prov: "IL", regione: "Estero · extra-UE", lat: 32.08, lon: 34.78 },
  { nome: "Sudafrica", prov: "ZA", regione: "Estero · extra-UE", lat: -25.74, lon: 28.19 },
  { nome: "Kenya", prov: "KE", regione: "Estero · extra-UE", lat: -1.29, lon: 36.82 },
  { nome: "Etiopia", prov: "ET", regione: "Estero · extra-UE", lat: 9.03, lon: 38.74 },
  { nome: "Brasile", prov: "BR", regione: "Estero · extra-UE", lat: -23.55, lon: -46.63 },
  { nome: "Argentina", prov: "AR", regione: "Estero · extra-UE", lat: -34.6, lon: -58.38 },
  { nome: "Cile", prov: "CL", regione: "Estero · extra-UE", lat: -33.45, lon: -70.67 },
  { nome: "Perù", prov: "PE", regione: "Estero · extra-UE", lat: -12.05, lon: -77.04 },
  { nome: "Ecuador", prov: "EC", regione: "Estero · extra-UE", lat: -0.18, lon: -78.47 },
  { nome: "Colombia", prov: "CO", regione: "Estero · extra-UE", lat: 4.71, lon: -74.07 },
  { nome: "Costa Rica", prov: "CR", regione: "Estero · extra-UE", lat: 9.93, lon: -84.08 },
  { nome: "Messico", prov: "MX", regione: "Estero · extra-UE", lat: 19.43, lon: -99.13 },
  { nome: "Stati Uniti", prov: "US", regione: "Estero · extra-UE", lat: 40.71, lon: -74.0 },
  { nome: "Canada", prov: "CA", regione: "Estero · extra-UE", lat: 45.42, lon: -75.7 },
  { nome: "Cina", prov: "CN", regione: "Estero · extra-UE", lat: 31.23, lon: 121.47 },
  { nome: "India", prov: "IN", regione: "Estero · extra-UE", lat: 19.08, lon: 72.88 },
  { nome: "Giappone", prov: "JP", regione: "Estero · extra-UE", lat: 35.68, lon: 139.69 },
  { nome: "Thailandia", prov: "TH", regione: "Estero · extra-UE", lat: 13.76, lon: 100.5 },
  { nome: "Vietnam", prov: "VN", regione: "Estero · extra-UE", lat: 21.03, lon: 105.85 },
  { nome: "Indonesia", prov: "ID", regione: "Estero · extra-UE", lat: -6.21, lon: 106.85 },
  { nome: "Australia", prov: "AU", regione: "Estero · extra-UE", lat: -35.28, lon: 149.13 },
  { nome: "Nuova Zelanda", prov: "NZ", regione: "Estero · extra-UE", lat: -41.29, lon: 174.78 },
];

let cache: Comune[] | null = null;
let loading: Promise<Comune[]> | null = null;

export async function loadComuni(): Promise<Comune[]> {
  if (cache) return cache;
  if (loading) return loading;
  loading = fetch(`${BASE}/comuni.json`)
    .then((r) => r.json())
    .then((rows: Row[]) => {
      const italiani = rows.map(([nome, prov, regione, lat, lon]) => ({
        nome,
        prov,
        regione,
        lat,
        lon,
      }));
      cache = [...italiani, ...ESTERI];
      return cache;
    })
    .catch(() => {
      // anche se i comuni non si caricano, le origini estere restano disponibili
      cache = [...ESTERI];
      return cache;
    });
  return loading;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

/** Cerca i comuni il cui nome inizia (o contiene) la query. */
export function searchComuni(list: Comune[], q: string, limit = 8): Comune[] {
  const n = norm(q);
  if (n.length < 2) return [];
  const starts: Comune[] = [];
  const contains: Comune[] = [];
  for (const c of list) {
    const cn = norm(c.nome);
    if (cn.startsWith(n)) starts.push(c);
    else if (cn.includes(n)) contains.push(c);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}
