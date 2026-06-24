import { notFound } from "next/navigation";
import Link from "next/link";
import { elencoBusinessConSlug, businessBySlug } from "@/lib/biofido-data";
import { CATEGORY_MAP, PLAN_MAP, type Plan } from "@/lib/categories";
import { citySlug } from "@/lib/zone-bio";
import { MappaPosizioneWrap } from "@/components/MappaPosizioneWrap";

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
  const showDesc = info.showDescription;
  const showContatti = info.showWebsite; // contatti (sito/telefono) da Silver
  const showImg = info.maxPhotos > 0; // foto da Silver
  const prodotti = info.showProducts && b.products ? b.products.slice(0, info.maxProducts) : [];

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

      {showImg && b.immagine && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={b.immagine}
          alt={b.name}
          className="mt-3 h-48 w-full rounded-2xl object-cover md:h-64"
        />
      )}

      <div className="mt-3 flex items-center gap-2">
        <span className="rounded-full bg-leaf px-3 py-1 text-xs font-bold text-green-800">
          {cat?.emoji} {cat?.label ?? "Attività bio"}
        </span>
        {b.plan === "gold" && (
          <span className="rounded-full bg-badge-yellow px-2 py-0.5 text-[10px] font-bold text-[#7a1f00]">
            ★ GOLD
          </span>
        )}
        {b.plan === "silver" && (
          <span className="rounded-full bg-[#c9d3da] px-2 py-0.5 text-[10px] font-bold text-[#33414a]">
            SILVER
          </span>
        )}
      </div>

      <h1 className="title-pangea mt-2 text-4xl text-green-700 md:text-5xl">{b.name}</h1>
      <p className="mt-1 text-green-900/70">
        {b.address ? `${b.address} · ` : ""}
        {b.city}
      </p>

      {showDesc && b.description && (
        <p className="mt-4 max-w-2xl whitespace-pre-line text-green-900/80">{b.description}</p>
      )}

      {showContatti && (b.website || b.phone) && (
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          {b.website && (
            <a
              href={b.website.startsWith("http") ? b.website : `https://${b.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-green-600 px-4 py-1.5 font-bold text-green-700 hover:bg-leaf"
            >
              🌐 Sito web
            </a>
          )}
          {b.phone && (
            <a
              href={`tel:${b.phone.replace(/\s+/g, "")}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-green-600 px-4 py-1.5 font-bold text-green-700 hover:bg-leaf"
            >
              📞 {b.phone}
            </a>
          )}
        </div>
      )}

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

      {prodotti.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-2xl text-green-800">Prodotti</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {prodotti.map((p, i) => (
              <div key={p.id ?? `${p.name}-${i}`} className="card overflow-hidden p-0">
                {showImg && p.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt={p.name} className="h-40 w-full object-cover" />
                )}
                <div className="p-5">
                  {p.category && (
                    <div className="text-xs font-bold uppercase tracking-wide text-lime-500">
                      {p.category}
                    </div>
                  )}
                  <h3 className="font-display text-xl leading-tight text-green-800">{p.name}</h3>
                  {p.description && (
                    <p className="mt-1 text-sm text-green-900/65">{p.description}</p>
                  )}
                  {p.price && (
                    <div className="mt-2 text-lg font-bold text-green-800">
                      {p.price}
                      {p.unit ? <span className="text-sm font-normal text-green-900/60"> {p.unit}</span> : null}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

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
