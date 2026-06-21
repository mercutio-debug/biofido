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
