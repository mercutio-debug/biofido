"use client";

/**
 * Contenuti commerciali degli abbonamenti BioFido, condivisi tra la pagina
 * pubblica /abbonamenti e la dashboard dell'azienda (così i costi sono
 * sempre sott'occhio dopo la registrazione).
 *
 * Tutti i prezzi e le commissioni provengono da PLAN_MAP in categories.ts:
 * un'unica fonte di verità. Cambi un valore lì e qui si aggiorna da solo.
 */

import { useState } from "react";
import Link from "next/link";
import { PLAN_MAP, type Plan } from "@/lib/categories";

const ORDER: Plan[] = ["free", "silver", "gold"];

const euro = (n: number) =>
  n === 0
    ? "Gratis"
    : new Intl.NumberFormat("it-IT", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }).format(n);

/** Prezzo mensile: mostra i centesimi solo se servono (es. 7,50 € · 20 €). */
const euroMese = (n: number) =>
  new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);

const pct = (r: number) => `${Math.round(r * 100)}%`;

/** Vantaggi mostrati su ogni cartoncino piano (copy curato a mano). */
const FEATURES: Record<Plan, string[]> = {
  free: [
    "Segnaposto sulla mappa",
    "Telefono visibile a chi ti cerca",
    "Categoria e città",
  ],
  silver: [
    "Segnaposto più grande con icona",
    "Scheda con descrizione, sito web e 3 foto",
    "Fino a 10 prodotti con foto e prezzi",
    "1 esperienza prenotabile + vendita online (15%)",
    "Statistiche base",
  ],
  gold: [
    "Massima visibilità + slot «in evidenza»",
    "Fino a 100 prodotti + video di presentazione",
    "Esperienze prenotabili illimitate",
    "Commissione ridotta (8%)",
    "Statistiche avanzate",
  ],
};

/* =========================================================================
   MANIFESTO + CITAZIONE FEUERBACH
   ========================================================================= */
export function ManifestoQualita() {
  return (
    <section className="mx-auto max-w-6xl px-4">
      <div className="grid items-stretch gap-6 md:grid-cols-[1.3fr_1fr]">
        {/* Testo-manifesto, grande ed evidenziato */}
        <div className="card relative overflow-hidden p-7 md:p-9">
          <span className="absolute inset-y-0 left-0 w-2 bg-lime-500" />
          <div className="text-xs font-bold uppercase tracking-wide text-lime-500">
            Perché conviene esserci
          </div>
          <p className="mt-3 text-2xl font-semibold leading-snug text-green-900 md:text-[1.7rem]">
            Lavori da sempre per fornire qualità e prodotti di altissimo livello,
            eppure, un mercato che si basa quasi unicamente su dinamiche legate al
            prezzo è una montagna invalicabile:{" "}
            <span className="text-green-700">
              dettiamo noi le regole al mercato
            </span>
            , mostriamo il nostro valore vero, quello su cui abbiamo investito
            tutta la vita: <span className="text-green-700">i nostri prodotti</span>.
            Qui non vince chi taglia i costi a discapito della qualità, della
            sicurezza e dell&apos;ambiente, ma{" "}
            <span className="text-green-700">
              chi offre il miglior prodotto possibile
            </span>
            .
          </p>
        </div>

        {/* Citazione Feuerbach incorniciata, con immagine evocativa */}
        <figure className="relative flex min-h-[260px] flex-col justify-end overflow-hidden rounded-2xl border-4 border-cape-red shadow-lg">
          <EvocativeScene />
          <figcaption className="relative z-10 bg-gradient-to-t from-black/70 via-black/45 to-transparent p-6 pt-16">
            <blockquote className="font-display text-3xl italic leading-tight text-white drop-shadow md:text-4xl">
              «Noi siamo quello che mangiamo»
            </blockquote>
            <div className="mt-2 text-sm font-semibold uppercase tracking-wide text-badge-yellow">
              Ludwig Feuerbach
            </div>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

/** Illustrazione SVG: campo coltivato al tramonto. Sostituibile con una foto. */
function EvocativeScene() {
  return (
    <svg
      className="absolute inset-0 h-full w-full object-cover"
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fcd9a0" />
          <stop offset="45%" stopColor="#f6b96b" />
          <stop offset="100%" stopColor="#e7884b" />
        </linearGradient>
        <linearGradient id="field" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8aa83a" />
          <stop offset="100%" stopColor="#5d7d22" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#sky)" />
      <circle cx="300" cy="95" r="46" fill="#fff1cf" opacity="0.95" />
      {/* colline sullo sfondo */}
      <path d="M0 175 Q110 140 220 172 T400 165 V300 H0 Z" fill="#bfae5e" opacity="0.55" />
      {/* campo in primo piano */}
      <path d="M0 200 Q120 178 250 205 T400 198 V300 H0 Z" fill="url(#field)" />
      {/* filari */}
      <g stroke="#3f5a16" strokeWidth="2" opacity="0.5">
        <path d="M30 300 L150 215" />
        <path d="M120 300 L195 215" />
        <path d="M220 300 L240 215" />
        <path d="M330 300 L290 215" />
      </g>
      {/* spighe di grano */}
      <g fill="#caa83f">
        <path d="M70 235 q4 -16 0 -30 q-4 14 0 30Z" />
        <path d="M88 240 q4 -16 0 -30 q-4 14 0 30Z" />
        <path d="M55 240 q4 -16 0 -30 q-4 14 0 30Z" />
      </g>
    </svg>
  );
}

/* =========================================================================
   PIANI — selezione semplice "alla Prime"
   ========================================================================= */
type Period = "monthly" | "annual";

export function PianiAbbonamento({
  currentPlan,
  selectedPlan,
  onSelect,
}: {
  /** piano attualmente attivo dell'azienda (mostra «Piano attuale») */
  currentPlan?: Plan;
  /** piano scelto ma non ancora attivato (evidenzia la card) */
  selectedPlan?: Plan;
  /** se assente, i pulsanti portano alla registrazione (pagina pubblica) */
  onSelect?: (plan: Plan, period: Period) => void;
}) {
  const [period, setPeriod] = useState<Period>("annual");

  return (
    <div>
      {/* interruttore mensile / annuale */}
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setPeriod("monthly")}
          className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
            period === "monthly"
              ? "bg-green-700 text-white"
              : "text-green-800 hover:bg-leaf"
          }`}
        >
          Mensile
        </button>
        <button
          type="button"
          onClick={() => setPeriod("annual")}
          className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
            period === "annual"
              ? "bg-green-700 text-white"
              : "text-green-800 hover:bg-leaf"
          }`}
        >
          Annuale
          <span className="ml-1 rounded-full bg-badge-yellow px-2 py-0.5 text-[11px] text-green-900">
            2 mesi gratis
          </span>
        </button>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {ORDER.map((id) => {
          const p = PLAN_MAP[id];
          const isGold = id === "gold";
          const isCurrent = currentPlan === id;
          const isSelected = selectedPlan === id;
          const isFree = id === "free";
          // Numero grande = prezzo MENSILE reale; sotto, il totale annuale.
          const monthlyShown = isFree ? 0 : p.monthlyPrice;

          return (
            <div
              key={id}
              className={`card relative flex flex-col p-6 ${
                isGold ? "ring-2 ring-badge-yellow" : ""
              } ${isSelected ? "ring-2 ring-lime-500" : ""}`}
            >
              {isGold && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-badge-yellow px-3 py-1 text-xs font-bold text-green-900">
                  ★ Consigliato
                </span>
              )}

              <div className="font-display text-2xl text-green-800">{p.label}</div>

              <div className="mt-2">
                <div className="flex items-end gap-1">
                  <span className="font-display text-4xl text-green-700">
                    {isFree ? "Gratis" : euroMese(monthlyShown)}
                  </span>
                  {!isFree && (
                    <span className="mb-1 text-sm text-green-900/60">/mese</span>
                  )}
                </div>
                {!isFree && (
                  <div className="text-sm font-medium text-green-900/60">
                    {period === "annual"
                      ? `${euro(p.annualPrice)} all'anno · 2 mesi gratis`
                      : `oppure ${euro(p.annualPrice)} all'anno`}
                  </div>
                )}
              </div>

              {/* commissione sulle vendite */}
              <div className="mt-1 text-sm font-semibold text-green-900/70">
                {p.canSell
                  ? `Commissione vendite ${pct(p.commissionRate)}`
                  : "Nessuna vendita online"}
              </div>

              <ul className="mt-4 flex-1 space-y-2 text-sm text-green-900/90">
                {FEATURES[id].map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-lime-500">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA — semplice, un clic */}
              <div className="mt-6">
                {isCurrent ? (
                  <div className="rounded-full border-2 border-green-600 px-4 py-2 text-center text-sm font-bold text-green-700">
                    Piano attuale
                  </div>
                ) : onSelect ? (
                  <button
                    type="button"
                    onClick={() => onSelect(id, period)}
                    className={isGold ? "btn-lime w-full justify-center" : "btn-ghost w-full justify-center"}
                  >
                    {isSelected ? "Selezionato ✓" : id === "free" ? "Resta su Free" : `Scegli ${p.label}`}
                  </button>
                ) : (
                  <Link
                    href="/registrati"
                    className={isGold ? "btn-lime w-full justify-center" : "btn-ghost w-full justify-center"}
                  >
                    {id === "free" ? "Inizia gratis" : `Scegli ${p.label}`}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-green-900/55">
        Commissione applicata alle esperienze prenotate (visite, degustazioni,
        corsi). Ordini di prodotto fisico senza commissione in fase di lancio.
        Disdici quando vuoi.
      </p>
    </div>
  );
}

/* =========================================================================
   AMICI DI FIDO — offerta soci fondatori
   ========================================================================= */
export function AmiciDiFido() {
  return (
    <section className="mx-auto max-w-6xl px-4">
      <div className="panel-dark relative overflow-hidden rounded-2xl p-7 md:p-9">
        <div className="grid items-center gap-5 md:grid-cols-[1fr_auto]">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-badge-yellow">
              🐾 Amici di Fido
            </div>
            <h3 className="mt-2 font-display text-3xl">
              Sei tra i primi della tua zona?
            </h3>
            <p className="mt-2 max-w-2xl text-[#eaf7d8]">
              Ai primi produttori che entrano in BioFido riserviamo il piano{" "}
              <strong>Gold a prezzo da fondatore</strong> e{" "}
              <strong>commissioni azzerate al lancio</strong>. Aiutaci a riempire
              la mappa del tuo territorio: cresciamo insieme, e il tuo valore lo
              vedono per primi.
            </p>
          </div>
          <Link href="/registrati" className="btn-lime whitespace-nowrap">
            Diventa Amico di Fido
          </Link>
        </div>
      </div>
    </section>
  );
}
