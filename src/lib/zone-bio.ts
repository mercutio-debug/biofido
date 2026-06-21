/**
 * SEO programmatica BioFido — pagine "Attività bio a {Città}". Aggrega le
 * attività biologiche per città, così generiamo al build una landing per ogni
 * località: motore di acquisizione organica, statico (output: export).
 *
 * Usa il dataset demo come il resto del sito. Quando le attività reali su
 * Supabase saranno numerose basta passare a `await loadBusinesses()` qui dentro
 * (generateStaticParams accetta funzioni async): stessa struttura, nessun redesign.
 */
import { DEMO_BUSINESSES, type Business } from "./biofido-data";
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

function tutteLeCitta(): string[] {
  return [...new Set(DEMO_BUSINESSES.map((b) => b.city))].sort((a, b) =>
    a.localeCompare(b, "it"),
  );
}

export function zonaBioDi(citta: string): ZonaBio | null {
  const attivita = DEMO_BUSINESSES.filter((b) => b.city === citta);
  if (!attivita.length) return null;
  const counts = new Map<CategoryId, number>();
  attivita.forEach((b) => counts.set(b.category, (counts.get(b.category) ?? 0) + 1));
  const categorie: ZonaCategoria[] = [...counts.entries()]
    .map(([id, count]) => ({
      id,
      label: CATEGORY_MAP[id].label,
      emoji: CATEGORY_MAP[id].emoji,
      count,
    }))
    .sort((a, b) => b.count - a.count);
  return { slug: citySlug(citta), citta, attivita, categorie };
}

export function tutteLeZoneBio(): ZonaBio[] {
  return tutteLeCitta()
    .map((c) => zonaBioDi(c))
    .filter((z): z is ZonaBio => z !== null);
}

export function zonaBioBySlug(slug: string): ZonaBio | null {
  const citta = tutteLeCitta().find((c) => citySlug(c) === slug);
  return citta ? zonaBioDi(citta) : null;
}
