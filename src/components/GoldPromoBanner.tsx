import Link from "next/link";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Banner pubblicitario del piano GOLD: invita le aziende a entrare nella
 * community, spiega i vantaggi e li confronta con un e-commerce tradizionale.
 * Gemello ECO-VISA / BioFido: il nome del portale è un parametro.
 */
export function GoldPromoBanner({ portale = "BioFido" }: { portale?: string }) {
  const vantaggi: [string, string, string][] = [
    ["🛍️", "Vendi i tuoi prodotti", "I clienti ordinano online — ai pagamenti pensiamo noi."],
    ["✨", "Servizi extra prenotabili", "Visite guidate, laboratori didattici, esperienze."],
    ["🏷️", "La tua azienda raccontata", "Descrizione, foto e contatti: una scheda completa."],
    ["📍", "Ti trovano nella community", "Visibilità tra chi cerca prodotti locali e bio."],
  ];

  return (
    <section className="mx-auto my-10 max-w-5xl px-4">
      <div className="overflow-hidden rounded-3xl border-2 border-badge-yellow bg-gradient-to-br from-[#fffbe9] to-leaf p-6 md:p-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${BASE}/brand/altalena-community.svg`}
          alt="Insieme vinciamo noi: la community bilancia i grandi portali"
          className="mx-auto mb-5 block w-full max-w-xl"
        />
        <span className="inline-block rounded-full bg-badge-yellow px-3 py-1 text-xs font-bold text-[#7a1f00]">
          ★ AZIENDA GOLD
        </span>
        <h2 className="title-pangea mt-3 text-3xl text-green-700 md:text-4xl">
          Entra nella community di {portale}
        </h2>
        <p className="mt-2 max-w-2xl text-green-900/85">
          Non hai un sito internet, o non hai il tempo di gestirlo e pubblicizzarlo? Con
          l&apos;abbonamento <strong>Gold</strong> ci pensiamo noi: tu pensi alla tua azienda,
          noi a farti trovare e a gestire ordini e pagamenti.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {vantaggi.map(([e, t, d]) => (
            <div key={t} className="flex items-start gap-3 rounded-2xl bg-white/70 p-3">
              <span className="text-xl">{e}</span>
              <div>
                <div className="font-semibold text-green-800">{t}</div>
                <div className="text-sm text-green-900/70">{d}</div>
              </div>
            </div>
          ))}
        </div>

        {/* confronto con un e-commerce tradizionale */}
        <div className="mt-5 rounded-2xl bg-white/70 p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-green-700">
            Quanto è più conveniente
          </div>
          <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
            <div className="rounded-xl border border-[#e3eed7] p-3">
              <div className="font-semibold text-green-800">Sito e-commerce tradizionale</div>
              <div className="mt-1 text-green-900/70">
                da ~€30/mese + dominio + manutenzione + <strong>il tuo tempo</strong> per gestirlo
              </div>
            </div>
            <div className="rounded-xl border-2 border-badge-yellow bg-[#fffbe9] p-3">
              <div className="font-semibold text-green-800">{portale} Gold</div>
              <div className="mt-1 text-green-900/70">
                <strong>€19/mese</strong> (o <strong>€14</strong> Fondatori) — tutto incluso,
                pagamenti gestiti da noi
              </div>
            </div>
            <div className="rounded-xl border border-[#e3eed7] p-3">
              <div className="font-semibold text-green-800">In più, con noi</div>
              <div className="mt-1 text-green-900/70">
                community, visibilità locale e niente da installare o aggiornare
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-sm italic text-green-900/75">
          Ti restituiamo la cosa più preziosa: il tuo <strong>tempo libero</strong> — lontano
          da uno schermo.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/abbonamenti" className="btn-lime">
            Scopri il piano Gold
          </Link>
          <Link
            href="/registrati"
            className="rounded-full border border-green-700 px-5 py-2.5 text-sm font-bold text-green-700 hover:bg-leaf"
          >
            Iscrivi la tua azienda
          </Link>
        </div>
      </div>
    </section>
  );
}
