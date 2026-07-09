"use client";

import { useState, useEffect } from "react";
import { isExtraScelto, setExtraScelto, onExtraChange } from "@/lib/extra-selezionati";
import { onboardingInCorso } from "@/lib/onboarding";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Cornice "community", presentata come ESTENSIONE del piano Gold (un ponte
 * visivo che la collega alla colonna Gold). Dentro c'è la spunta per aggiungere
 * l'onboarding ("Il tuo negozio chiavi in mano"): chi la spunta lo paga insieme
 * all'abbonamento Gold. Gemello ECO-VISA / BioFido.
 */
export function GoldPromoBanner({
  portale = "ECO-VISA",
  plan,
}: {
  portale?: string;
  plan?: "free" | "silver" | "gold";
}) {
  const [, force] = useState(0);
  useEffect(() => onExtraChange(() => force((n) => n + 1)), []);
  // onboarding GIÀ in corso (acquistato, non ancora completato dal team): non
  // va riacquistato → checkbox disattivata + invito a caricare il materiale.
  const [inCorso, setInCorso] = useState(false);
  useEffect(() => {
    onboardingInCorso().then(setInCorso);
  }, []);
  // l'onboarding è un servizio GOLD: spuntabile solo col piano Gold e se non è già in corso
  const canOnboarding = plan === "gold" && !inCorso;
  const onboarding = canOnboarding && isExtraScelto("onboarding");
  // se non è Gold, non deve restare selezionato (es. dopo un cambio piano)
  useEffect(() => {
    if (!canOnboarding && isExtraScelto("onboarding")) setExtraScelto("onboarding", false);
  }, [canOnboarding]);

  const vantaggi: [string, string, string][] = [
    ["🛍️", "Vendi i tuoi prodotti", "I clienti ordinano online — ai pagamenti pensiamo noi."],
    ["✨", "Servizi extra prenotabili", "Visite guidate, laboratori didattici, esperienze."],
    ["🏷️", "La tua azienda raccontata", "Descrizione, foto e contatti: una scheda completa."],
    ["📍", "Ti trovano nella community", "Visibilità tra chi cerca prodotti locali a km0."],
  ];

  return (
    <section className="mx-auto my-10 max-w-5xl px-4">
      {/* ponte visivo verso la colonna Gold */}
      <div className="flex justify-center">
        <div className="h-6 w-0.5 bg-badge-yellow" />
      </div>
      <div className="mx-auto -mb-3 w-fit rounded-full bg-badge-yellow px-4 py-1 text-xs font-bold text-[#7a1f00]">
        ▲ Estensione del piano GOLD
      </div>

      <div className="overflow-hidden rounded-3xl border-2 border-badge-yellow bg-gradient-to-br from-[#fffbe9] to-leaf p-6 pt-7 md:p-8 md:pt-9">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${BASE}/brand/altalena-community.svg`}
          alt="Insieme vinciamo noi: la community bilancia i grandi portali"
          className="mx-auto mb-5 block w-full max-w-xl"
        />
        <h2 className="title-pangea text-3xl text-green-700 md:text-4xl">
          Entra nella community di {portale}
        </h2>
        <p className="mt-2 max-w-2xl text-green-900/85">
          Non hai un sito internet, o non hai il tempo di gestirlo e pubblicizzarlo? Con
          l&apos;abbonamento <strong>Gold</strong> ci pensiamo noi: tu pensi alla tua azienda,
          noi a farti trovare e a gestire ordini e pagamenti.
        </p>

        {/* SPUNTA onboarding: il servizio premium, incluso nel pagamento del Gold */}
        <div
          className={`mt-5 rounded-2xl border-2 border-green-700 bg-white p-4 ${
            canOnboarding ? "" : "opacity-70"
          }`}
        >
          <label
            className={`flex items-start gap-3 ${
              canOnboarding ? "cursor-pointer" : "cursor-not-allowed"
            }`}
          >
            <input
              type="checkbox"
              disabled={!canOnboarding}
              checked={onboarding}
              onChange={(e) => canOnboarding && setExtraScelto("onboarding", e.target.checked)}
              className="mt-1 h-6 w-6 shrink-0 accent-[var(--lime-500)] disabled:opacity-40"
            />
            <span>
              <span className="font-display text-xl text-green-800">
                🚀 Il tuo negozio chiavi in mano: pensiamo noi a tutto!
              </span>
              <span className="mt-1 block text-sm text-green-900/75">
                Tu ci mandi listino e foto, noi creiamo il tuo negozio online completo
                (il servizio «Ci pensiamo noi»).{" "}
                {inCorso ? (
                  <strong className="text-[#7a1f00]">
                    ✓ Onboarding già in corso — vai in fondo alla pagina, nella cornice «Ci
                    pensiamo noi», per caricare il tuo materiale.
                  </strong>
                ) : !canOnboarding ? (
                  <strong className="text-[#7a5a00]">🔒 Disponibile con il piano Gold.</strong>
                ) : onboarding ? (
                  <strong className="text-green-700">Aggiunto: lo paghi col tuo Gold ✓</strong>
                ) : (
                  <>Spuntalo per aggiungerlo: lo paghi insieme all&apos;abbonamento Gold.</>
                )}
              </span>
              <a
                href={`${BASE}/demo/onboarding/`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-sm font-bold text-green-700 hover:text-lime-500"
              >
                Per saperne di più →
              </a>
            </span>
          </label>
        </div>

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
      </div>
    </section>
  );
}
