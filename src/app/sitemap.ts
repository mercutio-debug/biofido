import type { MetadataRoute } from "next";
import { tutteLeZoneBio, tutteLeRegioniBio } from "@/lib/zone-bio";
import { elencoBusinessConSlug } from "@/lib/biofido-data";

// Sitemap statica (output: export). BioFido è servito sul dominio proprio
// biofido.it (Hostinger): URL assoluti su quel dominio.
const BASE = "https://biofido.it";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const statiche: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/bio/`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/servizi-extra/`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/abbonamenti/`, changeFrequency: "monthly", priority: 0.5 },
  ];
  const zone: MetadataRoute.Sitemap = (await tutteLeZoneBio()).map((z) => ({
    url: `${BASE}/bio/${z.slug}/`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));
  const regioni: MetadataRoute.Sitemap = (await tutteLeRegioniBio()).map((r) => ({
    url: `${BASE}/bio/regione/${r.slug}/`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));
  let aziende: MetadataRoute.Sitemap = [];
  try {
    aziende = (await elencoBusinessConSlug()).map((b) => ({
      url: `${BASE}/azienda/${b.slug}/`,
      changeFrequency: "weekly",
      priority: 0.7,
    }));
  } catch {
    aziende = [];
  }
  return [...statiche, ...zone, ...regioni, ...aziende];
}
