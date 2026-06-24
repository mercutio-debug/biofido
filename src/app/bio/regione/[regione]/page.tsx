import { notFound } from "next/navigation";
import Link from "next/link";
import { tutteLeRegioniBio, regioneBioBySlug } from "@/lib/zone-bio";

// Hub SEO statico: "Attività biologiche in {Regione}" che raggruppa le città
// della regione, con conteggi e link alle pagine-città. Generata al build.

export async function generateStaticParams() {
  const regioni = await tutteLeRegioniBio();
  return regioni.map((r) => ({ regione: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ regione: string }>;
}) {
  const { regione } = await params;
  const r = await regioneBioBySlug(regione);
  if (!r) return { title: "Attività bio — BioFido" };
  const citta = r.zone.map((z) => z.citta).slice(0, 6).join(", ");
  return {
    title: `Attività biologiche in ${r.nome}: produttori, negozi e ristoranti bio | BioFido`,
    description:
      `Attività biologiche in ${r.nome}: ${r.zone.length} città (${citta}) e ` +
      `${r.nAttivita} produttori, negozi e ristoranti bio. Spesa a chilometro zero ` +
      `e filiera corta, vicino a te, con BioFido.`,
    alternates: {
      canonical: `https://biofido.it/bio/regione/${r.slug}/`,
    },
  };
}

export default async function RegioneBioPage({
  params,
}: {
  params: Promise<{ regione: string }>;
}) {
  const { regione } = await params;
  const r = await regioneBioBySlug(regione);
  if (!r) notFound();

  const altre = (await tutteLeRegioniBio()).filter((x) => x.slug !== r.slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Attività biologiche in ${r.nome}`,
    about: `Produttori, negozi e ristoranti biologici in ${r.nome}`,
    hasPart: r.zone.map((z) => ({
      "@type": "WebPage",
      name: `Attività biologiche a ${z.citta}`,
      url: `https://biofido.it/bio/${z.slug}/`,
    })),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="text-sm text-green-900/60">
        <Link href="/bio" className="font-bold text-green-700 hover:text-lime-500">
          Attività bio
        </Link>{" "}
        / <span>{r.nome}</span>
      </nav>

      <h1 className="title-pangea mt-2 text-4xl text-green-700 md:text-5xl">
        Attività biologiche in {r.nome}
      </h1>
      <p className="mt-3 max-w-2xl text-green-900/80">
        Produttori, negozi e ristoranti <strong>biologici</strong> in{" "}
        <strong>{r.nome}</strong>: scegli la tua città e raggiungili sulla mappa di
        BioFido, per una spesa a chilometro zero e filiera corta.
      </p>

      <p className="mt-4 text-sm font-bold text-green-900/70">
        {r.zone.length} città · {r.nAttivita} attività bio
      </p>

      {r.categorie.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {r.categorie.map((c) => (
            <span
              key={c.id}
              className="rounded-full bg-leaf px-3 py-1 text-xs font-bold text-green-800"
            >
              {c.emoji} {c.label} ({c.count})
            </span>
          ))}
        </div>
      )}

      {/* Città della regione */}
      <section className="mt-10">
        <h2 className="title-pangea text-2xl text-green-700">Città in {r.nome}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {r.zone.map((z) => (
            <Link
              key={z.slug}
              href={`/bio/${z.slug}`}
              className="card p-5 transition hover:-translate-y-1"
            >
              <h3 className="font-display text-2xl text-green-800">{z.citta}</h3>
              <p className="mt-1 text-sm text-green-900/70">
                {z.attivita.length} attività bio
              </p>
              {z.categorie.length > 0 && (
                <p className="mt-2 text-xs text-green-900/60">
                  {z.categorie.map((c) => c.label).slice(0, 4).join(" · ")}
                </p>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* CTA azienda */}
      <div className="mt-12 rounded-2xl border border-[#e3eed7] bg-leaf p-6">
        <h2 className="font-display text-2xl text-green-800">
          Hai un&apos;attività bio in {r.nome}?
        </h2>
        <p className="mt-1 text-green-900/80">
          Fatti trovare da chi cerca prodotti biologici nella tua zona: iscrivi la
          tua attività sulla mappa di BioFido. La scheda base è gratuita.
        </p>
        <Link href="/registrati" className="btn-lime mt-4 inline-block">
          Iscrivi la tua attività
        </Link>
      </div>

      {/* Altre regioni (crawlability) */}
      {altre.length > 0 && (
        <section className="mt-12 border-t border-[#e8f1dc] pt-6">
          <h2 className="label mb-3">Attività bio in altre regioni</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {altre.map((x) => (
              <Link
                key={x.slug}
                href={`/bio/regione/${x.slug}`}
                className="font-bold text-green-700 hover:text-lime-500"
              >
                {x.nome}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
