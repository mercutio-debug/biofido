import Link from "next/link";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Riquadro promozionale (sotto la mappa in home) che incorpora la presentazione
 * dell'onboarding assistito. La demo è statica in /demo/onboarding/.
 */
export function OnboardingPromo() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="rounded-3xl border border-[#e3eed7] bg-leaf/40 p-6 md:p-8">
        <div className="md:flex md:items-end md:justify-between md:gap-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-lime-500">
              Novità · Ci pensiamo noi
            </div>
            <h2 className="mt-1 font-display text-2xl text-green-800 md:text-3xl">
              Hai un&apos;attività bio? La mettiamo online noi.
            </h2>
            <p className="mt-2 max-w-xl text-green-900/75">
              Tu invii listino e foto, al resto pensiamo noi. Guarda come funziona:
            </p>
          </div>
          <div className="mt-4 flex gap-3 md:mt-0">
            <a
              href={`${BASE}/demo/onboarding/`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-lime justify-center text-sm"
            >
              ▶ Schermo intero
            </a>
            <Link href="/servizi-extra" className="btn-ghost justify-center text-sm">
              Tutti i servizi
            </Link>
          </div>
        </div>
        <div className="mt-6 overflow-hidden rounded-2xl border border-[#e3eed7] bg-[#0e2417] shadow-lg">
          <iframe
            src={`${BASE}/demo/onboarding/`}
            title="Demo «Ci pensiamo noi» BioFido"
            loading="lazy"
            className="h-[420px] w-full md:h-[520px]"
          />
        </div>
      </div>
    </section>
  );
}
