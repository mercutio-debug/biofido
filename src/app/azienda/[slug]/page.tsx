import { notFound } from "next/navigation";
import Link from "next/link";
import { elencoBusinessConSlug, businessBySlug } from "@/lib/biofido-data";
import { CATEGORY_MAP, PLAN_MAP, type Plan } from "@/lib/categories";
import { citySlug } from "@/lib/zone-bio";
import { MappaPosizioneWrap } from "@/components/MappaPosizioneWrap";
import { SchedaPubblicaClient } from "@/components/SchedaPubblicaClient";

// Pagina pubblica condivisibile di un'attività bio: URL pulito /azienda/{slug},
// contenuto nell'HTML (indicizzabile), Open Graph + JSON-LD LocalBusiness con
// geo. Generata al build dalle attività iscritte (fallback dati demo). Diventa
// di fatto il "mini-sito" del produttore, da condividere su social/mail/carta.

const SITE = "https://mercutio-debug.github.io/biofido";

export const dynamicParams = false;

export async function generateStaticParams() {
  const a = await elencoBusinessConSlug();
  return a.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const b = await businessBySlug(slug);
  if (!b) return { title: "Attività bio — BioFido" };
  const cat = CATEGORY_MAP[b.category]?.label ?? "Attività bio";
  return {
    title: `${b.name} · ${b.city} — ${cat} biologica | BioFido`,
    description:
      `${b.name}: ${cat.toLowerCase()} biologica a ${b.city}` +
      `${b.address ? ` (${b.address})` : ""}. Trovala sulla mappa di BioFido — ` +
      `spesa a chilometro zero e filiera corta.`,
    alternates: { canonical: `${SITE}/azienda/${slug}/` },
    openGraph: {
      title: `${b.name} · ${b.city}`,
      description: `${cat} biologica a ${b.city}, su BioFido.`,
      url: `${SITE}/azienda/${slug}/`,
      type: "profile",
    },
  };
}

export default async function AziendaBioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const b = await businessBySlug(slug);
  if (!b) notFound();

  const cat = CATEGORY_MAP[b.category];
  const info = PLAN_MAP[(b.plan as Plan) ?? "free"] ?? PLAN_MAP.free;
  const showContatti = info.showWebsite; // usato nel JSON-LD (sito/telefono da Silver)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: b.name,
    url: `${SITE}/azienda/${slug}/`,
    address: {
      "@type": "PostalAddress",
      streetAddress: b.address || undefined,
      addressLocality: b.city,
      addressCountry: "IT",
    },
    ...(Number.isFinite(b.lat) && Number.isFinite(b.lon)
      ? { geo: { "@type": "GeoCoordinates", latitude: b.lat, longitude: b.lon } }
      : {}),
    ...(showContatti && b.website ? { sameAs: [b.website] } : {}),
    ...(showContatti && b.phone ? { telephone: b.phone } : {}),
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="text-sm text-green-900/60">
        <Link href="/bio" className="font-bold text-green-700 hover:text-lime-500">
          Attività bio
        </Link>{" "}
        /{" "}
        <Link
          href={`/bio/${citySlug(b.city)}`}
          className="font-bold text-green-700 hover:text-lime-500"
        >
          {b.city}
        </Link>{" "}
        / <span>{b.name}</span>
      </nav>

      {/* H1 per la SEO (la scheda interattiva qui sotto usa un H2 per il nome) */}
      <h1 className="sr-only">
        {b.name} · {cat?.label ?? "Attività bio"} a {b.city}
      </h1>

      {/* Scheda RICCA e interattiva: copertina, descrizione, prodotti espandibili,
          servizi/esperienze con descrizione e prenotazione — come nell'app, ma
          con URL proprio (condivisibile + indicizzabile). */}
      <div className="mt-4">
        <SchedaPubblicaClient business={b} demo={String(b.id).startsWith("demo-")} />
      </div>

      {Number.isFinite(b.lat) && Number.isFinite(b.lon) && (
        <div className="mt-6">
          <h2 className="font-display text-2xl text-green-800">Dove si trova</h2>
          <p className="mt-1 text-sm text-green-900/70">
            {b.address ? `${b.address} · ` : ""}
            {b.city}
          </p>
          <div className="mt-3">
            <MappaPosizioneWrap lat={b.lat} lon={b.lon} label={b.name} />
          </div>
        </div>
      )}

      <Link href="/#mappa" className="btn-lime mt-5 inline-block">
        📍 Vedi tutte sulla mappa
      </Link>

      {/* CTA azienda */}
      <div className="mt-12 rounded-2xl border border-[#e3eed7] bg-leaf p-6">
        <h2 className="font-display text-2xl text-green-800">Hai un&apos;attività bio?</h2>
        <p className="mt-1 text-green-900/80">
          Crea anche tu la tua pagina su BioFido: condividila su social, sito, mail e
          carta intestata. La scheda base è gratuita.
        </p>
        <Link href="/registrati" className="btn-lime mt-4 inline-block">
          Iscrivi la tua attività
        </Link>
      </div>
    </div>
  );
}
