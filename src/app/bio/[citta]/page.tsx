import { notFound } from "next/navigation";
import Link from "next/link";
import { tutteLeZoneBio, zonaBioBySlug } from "@/lib/zone-bio";
import { CATEGORY_MAP } from "@/lib/categories";

// Pagina SEO statica: "Attività bio a {Città}". Generata al build (output: export).

export async function generateStaticParams() {
  const zone = await tutteLeZoneBio();
  return zone.map((z) => ({ citta: z.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ citta: string }>;
}) {
  const { citta } = await params;
  const z = await zonaBioBySlug(citta);
  if (!z) return { title: "Attività bio — BioFido" };
  const cat = z.categorie.map((c) => c.label).slice(0, 4).join(", ");
  return {
    title: `Attività biologiche a ${z.citta}: produttori, negozi e ristoranti bio | BioFido`,
    description:
      `${z.attivita.length} attività biologiche a ${z.citta}${cat ? `: ${cat}` : ""}. ` +
      `Trova produttori, negozi e ristoranti bio vicino a te e raggiungili sulla mappa di BioFido.`,
    alternates: {
      canonical: `https://mercutio-debug.github.io/biofido/bio/${z.slug}/`,
    },
  };
}

export default async function ZonaBioPage({
  params,
}: {
  params: Promise<{ citta: string }>;
}) {
  const { citta } = await params;
  const z = await zonaBioBySlug(citta);
  if (!z) notFound();

  const altre = (await tutteLeZoneBio()).filter((x) => x.slug !== z.slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Attività biologiche a ${z.citta}`,
    about: `Produttori, negozi e ristoranti biologici a ${z.citta}`,
    hasPart: z.attivita.map((b) => ({
      "@type": "LocalBusiness",
      name: b.name,
      address: {
        "@type": "PostalAddress",
        streetAddress: b.address ?? undefined,
        addressLocality: z.citta,
      },
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
        / <span>{z.citta}</span>
      </nav>

      <h1 className="title-pangea mt-2 text-4xl text-green-700 md:text-5xl">
        Attività biologiche a {z.citta}
      </h1>
      <p className="mt-3 max-w-2xl text-green-900/80">
        Produttori, negozi e ristoranti <strong>biologici</strong> a{" "}
        <strong>{z.citta}</strong>: scoprili qui e raggiungili sulla mappa di BioFido,
        per una spesa a chilometro zero e filiera corta.
      </p>

      {z.categorie.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {z.categorie.map((c) => (
            <span
              key={c.id}
              className="rounded-full bg-leaf px-3 py-1 text-xs font-bold text-green-800"
            >
              {c.emoji} {c.label} ({c.count})
            </span>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {z.attivita.map((b) => {
          const cat = CATEGORY_MAP[b.category];
          return (
            <div key={b.id} className="card p-5">
              <div className="text-xs font-bold uppercase tracking-wide text-lime-500">
                {cat?.emoji} {cat?.label ?? b.category}
              </div>
              <h2 className="font-display text-xl text-green-800">{b.name}</h2>
              {b.description && (
                <p className="mt-1 text-sm text-green-900/70">{b.description}</p>
              )}
              {b.address && (
                <p className="mt-2 text-xs text-green-900/60">
                  {b.address} · {z.citta}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <Link href="/#mappa" className="btn-lime mt-6 inline-block">
        Vedi tutte le attività bio sulla mappa
      </Link>

      {/* CTA azienda */}
      <div className="mt-12 rounded-2xl border border-[#e3eed7] bg-leaf p-6">
        <h2 className="font-display text-2xl text-green-800">
          Hai un&apos;attività bio a {z.citta}?
        </h2>
        <p className="mt-1 text-green-900/80">
          Fatti trovare da chi cerca prodotti biologici a {z.citta}: iscrivi la tua
          attività sulla mappa di BioFido. La scheda base è gratuita.
        </p>
        <Link href="/registrati" className="btn-lime mt-4 inline-block">
          Iscrivi la tua attività
        </Link>
      </div>

      {/* Hub di link alle altre città (crawlability) */}
      {altre.length > 0 && (
        <section className="mt-12 border-t border-[#e8f1dc] pt-6">
          <h2 className="label mb-3">Attività bio in altre città</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {altre.map((x) => (
              <Link
                key={x.slug}
                href={`/bio/${x.slug}`}
                className="font-bold text-green-700 hover:text-lime-500"
              >
                {x.citta}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
