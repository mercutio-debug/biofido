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

let cache: Comune[] | null = null;
let loading: Promise<Comune[]> | null = null;

export async function loadComuni(): Promise<Comune[]> {
  if (cache) return cache;
  if (loading) return loading;
  loading = fetch(`${BASE}/comuni.json`)
    .then((r) => r.json())
    .then((rows: Row[]) => {
      cache = rows.map(([nome, prov, regione, lat, lon]) => ({
        nome,
        prov,
        regione,
        lat,
        lon,
      }));
      return cache;
    })
    .catch(() => {
      cache = [];
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
