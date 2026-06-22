/**
 * SEO programmatica BioFido — pagine "Attività bio a {Città}". Aggrega le
 * attività biologiche per città, così generiamo al build una landing per ogni
 * località: motore di acquisizione organica, statico (output: export).
 *
 * Dati REALI: legge le attività iscritte da Supabase (`loadBusinesses`, con
 * fallback automatico ai dati demo se il DB è vuoto o irraggiungibile al build).
 * Le funzioni sono async: generateStaticParams, le pagine e la sitemap le awaitano.
 */
import { loadBusinesses, type Business } from "./biofido-data";
import { CATEGORY_MAP, type CategoryId } from "./categories";

/** Slug url-safe da un nome di città (minuscolo, accenti rimossi, spazi → -). */
export function citySlug(city: string): string {
  return city
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type ZonaCategoria = {
  id: CategoryId;
  label: string;
  emoji: string;
  count: number;
};

export type ZonaBio = {
  slug: string;
  citta: string;
  attivita: Business[];
  categorie: ZonaCategoria[];
};

/** Attività da Supabase (con fallback automatico ai demo dentro loadBusinesses). */
async function tutteLeAttivita(): Promise<Business[]> {
  const { items } = await loadBusinesses();
  return items;
}

function buildZona(attivita: Business[], citta: string): ZonaBio | null {
  const inCitta = attivita.filter((b) => b.city === citta);
  if (!inCitta.length) return null;
  const counts = new Map<CategoryId, number>();
  inCitta.forEach((b) => counts.set(b.category, (counts.get(b.category) ?? 0) + 1));
  const categorie: ZonaCategoria[] = [...counts.entries()]
    .map(([id, count]) => ({
      id,
      label: CATEGORY_MAP[id].label,
      emoji: CATEGORY_MAP[id].emoji,
      count,
    }))
    .sort((a, b) => b.count - a.count);
  return { slug: citySlug(citta), citta, attivita: inCitta, categorie };
}

export async function tutteLeZoneBio(): Promise<ZonaBio[]> {
  const attivita = await tutteLeAttivita();
  const citta = [...new Set(attivita.map((b) => b.city))].sort((a, b) =>
    a.localeCompare(b, "it"),
  );
  return citta
    .map((c) => buildZona(attivita, c))
    .filter((z): z is ZonaBio => z !== null);
}

export async function zonaBioBySlug(slug: string): Promise<ZonaBio | null> {
  const attivita = await tutteLeAttivita();
  const citta = [...new Set(attivita.map((b) => b.city))].find(
    (c) => citySlug(c) === slug,
  );
  return citta ? buildZona(attivita, citta) : null;
}

/* ------------------------------------------------------------------ *
 *  Hub regionali — raggruppano le città per regione: poche pagine,
 *  ricche di contenuto e di link interni (rafforzano le pagine-città).
 * ------------------------------------------------------------------ */

/** Città (slug) → regione italiana. Le città non mappate non entrano negli hub
 *  regionali ma mantengono comunque la loro pagina-città. */
const CITY_REGION: Record<string, string> = {
  torino: "Piemonte", cuneo: "Piemonte", asti: "Piemonte", alessandria: "Piemonte",
  novara: "Piemonte", biella: "Piemonte", vercelli: "Piemonte", verbania: "Piemonte",
  aosta: "Valle d'Aosta",
  genova: "Liguria", savona: "Liguria", "la-spezia": "Liguria", imperia: "Liguria",
  milano: "Lombardia", bergamo: "Lombardia", brescia: "Lombardia", como: "Lombardia",
  pavia: "Lombardia", monza: "Lombardia", mantova: "Lombardia", cremona: "Lombardia",
  varese: "Lombardia", lecco: "Lombardia", lodi: "Lombardia", sondrio: "Lombardia",
  trento: "Trentino-Alto Adige", bolzano: "Trentino-Alto Adige",
  venezia: "Veneto", verona: "Veneto", padova: "Veneto", vicenza: "Veneto",
  treviso: "Veneto", rovigo: "Veneto", belluno: "Veneto",
  trieste: "Friuli-Venezia Giulia", udine: "Friuli-Venezia Giulia",
  pordenone: "Friuli-Venezia Giulia", gorizia: "Friuli-Venezia Giulia",
  bologna: "Emilia-Romagna", modena: "Emilia-Romagna", parma: "Emilia-Romagna",
  "reggio-emilia": "Emilia-Romagna", ferrara: "Emilia-Romagna", ravenna: "Emilia-Romagna",
  forli: "Emilia-Romagna", rimini: "Emilia-Romagna", piacenza: "Emilia-Romagna", cesena: "Emilia-Romagna",
  firenze: "Toscana", pisa: "Toscana", siena: "Toscana", lucca: "Toscana",
  livorno: "Toscana", arezzo: "Toscana", grosseto: "Toscana", prato: "Toscana",
  pistoia: "Toscana", massa: "Toscana", carrara: "Toscana",
  perugia: "Umbria", terni: "Umbria",
  ancona: "Marche", pesaro: "Marche", macerata: "Marche", "ascoli-piceno": "Marche", fermo: "Marche",
  roma: "Lazio", latina: "Lazio", frosinone: "Lazio", viterbo: "Lazio", rieti: "Lazio",
  "l-aquila": "Abruzzo", pescara: "Abruzzo", chieti: "Abruzzo", teramo: "Abruzzo",
  campobasso: "Molise", isernia: "Molise",
  napoli: "Campania", salerno: "Campania", caserta: "Campania", avellino: "Campania", benevento: "Campania",
  bari: "Puglia", lecce: "Puglia", taranto: "Puglia", brindisi: "Puglia",
  foggia: "Puglia", andria: "Puglia", barletta: "Puglia", trani: "Puglia",
  potenza: "Basilicata", matera: "Basilicata",
  catanzaro: "Calabria", cosenza: "Calabria", "reggio-calabria": "Calabria",
  crotone: "Calabria", "vibo-valentia": "Calabria",
  palermo: "Sicilia", catania: "Sicilia", messina: "Sicilia", siracusa: "Sicilia",
  trapani: "Sicilia", ragusa: "Sicilia", agrigento: "Sicilia", caltanissetta: "Sicilia", enna: "Sicilia",
  cagliari: "Sardegna", sassari: "Sardegna", nuoro: "Sardegna", oristano: "Sardegna",
};

export type RegioneBio = {
  slug: string;
  nome: string;
  zone: ZonaBio[];
  nAttivita: number;
  categorie: ZonaCategoria[];
};

/** Regione di una città (per breadcrumb dalla pagina-città), null se non mappata. */
export function regioneDiCitta(citta: string): { nome: string; slug: string } | null {
  const nome = CITY_REGION[citySlug(citta)];
  return nome ? { nome, slug: citySlug(nome) } : null;
}

export async function tutteLeRegioniBio(): Promise<RegioneBio[]> {
  const zone = await tutteLeZoneBio();
  const map = new Map<string, ZonaBio[]>();
  for (const z of zone) {
    const reg = CITY_REGION[citySlug(z.citta)];
    if (!reg) continue;
    map.set(reg, [...(map.get(reg) ?? []), z]);
  }
  return [...map.entries()]
    .map(([nome, zs]) => {
      const counts = new Map<CategoryId, ZonaCategoria>();
      for (const z of zs) {
        for (const c of z.categorie) {
          const prev = counts.get(c.id);
          counts.set(c.id, prev ? { ...prev, count: prev.count + c.count } : { ...c });
        }
      }
      return {
        slug: citySlug(nome),
        nome,
        zone: zs.sort((a, b) => a.citta.localeCompare(b.citta, "it")),
        nAttivita: zs.reduce((s, z) => s + z.attivita.length, 0),
        categorie: [...counts.values()].sort((a, b) => b.count - a.count),
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "it"));
}

export async function regioneBioBySlug(slug: string): Promise<RegioneBio | null> {
  return (await tutteLeRegioniBio()).find((r) => r.slug === slug) ?? null;
}
