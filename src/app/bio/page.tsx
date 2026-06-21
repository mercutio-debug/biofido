import Link from "next/link";
import { tutteLeZoneBio } from "@/lib/zone-bio";

export const metadata = {
  title: "Attività biologiche per città: produttori, negozi e ristoranti bio | BioFido",
  description:
    "Scegli la tua città e scopri produttori, negozi e ristoranti biologici vicino a te. Spesa a chilometro zero e filiera corta con BioFido.",
  alternates: { canonical: "https://mercutio-debug.github.io/biofido/bio/" },
};

export default async function BioIndex() {
  const zone = await tutteLeZoneBio();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="title-pangea text-5xl text-green-700">Attività bio, città per città</h1>
      <p className="mt-3 max-w-2xl text-green-900/80">
        Produttori, negozi e ristoranti biologici vicino a te. Scegli la città e
        scopri chi fa spesa a chilometro zero e filiera corta.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {zone.map((z) => (
          <Link
            key={z.slug}
            href={`/bio/${z.slug}`}
            className="card p-5 transition hover:-translate-y-1"
          >
            <h2 className="font-display text-2xl text-green-800">{z.citta}</h2>
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
    </div>
  );
}
