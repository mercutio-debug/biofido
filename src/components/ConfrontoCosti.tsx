"use client";

import { useState } from "react";

/**
 * Richiamo d'upsell: il Gold (€14/mese prezzo Fondatori) costa meno della METÀ
 * di un negozio come Shopify (€28/mese) e offre molto di più. Compare ovunque in
 * modo intelligente: "badge" compatto ed espandibile (dashboard, accanto al
 * prezzo) o "card" completa (home). Vedi la slide del progetto.
 */
const NOI = [
  "Negozio online + scheda-sito completa",
  "Semaforo di sostenibilità incluso",
  "Visibilità sulla mappa bio",
  "Prenotazioni, badge e statistiche",
  "Onboarding: lo shop lo carichiamo noi *",
];
const SHOP = [
  "Solo il negozio online",
  "Commissioni sulle vendite e app a parte",
  "Tema e configurazione a carico tuo",
  "Nessun pubblico bio, nessuna sostenibilità",
];

function Card() {
  return (
    <div className="rounded-2xl border border-[#e3eed7] bg-[#f4f7ee] p-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-green-700/70">Confronto</div>
      <div className="font-display text-xl text-green-900">
        Gold a <span className="text-green-600">€14</span>, contro Shopify a €28
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[#e3eed7] bg-white p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-green-900/45">Shopify · Basic</div>
          <div className="font-display text-2xl text-green-900/80">
            €28<span className="text-sm font-normal text-green-900/50">/mese</span>
          </div>
          <ul className="mt-2 space-y-1">
            {SHOP.map((s) => (
              <li key={s} className="flex items-start gap-2 text-xs text-green-900/65">
                <span className="text-traffic-red">✗</span> {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-green-700 p-3 text-white">
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/70">ECO-VISA + BioFido · Gold</div>
          <div className="font-display text-2xl">
            €14<span className="text-sm font-normal text-white/70">/mese</span>
          </div>
          <ul className="mt-2 space-y-1">
            {NOI.map((s) => (
              <li key={s} className="flex items-start gap-2 text-xs text-white/90">
                <span>✓</span> {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-green-700 px-4 py-2 text-center text-sm font-semibold text-white">
        Meno della metà del prezzo — e molto più di un semplice negozio.
      </div>
      <p className="mt-2 text-[11px] text-green-900/55">
        * Il servizio «Onboarding – Ci pensiamo noi» è un servizio extra acquistabile con il piano
        Gold: costi e modalità nella scheda «Servizi extra».
      </p>
      <p className="mt-1 text-[11px] text-green-900/45">
        Gold €14/mese, prezzo Fondatori (listino €19) · Shopify Basic €28/mese + commissioni e app a parte. Fonte: shopify.com, 2026.
      </p>
    </div>
  );
}

export function ConfrontoCosti({ variant = "badge" }: { variant?: "badge" | "card" }) {
  const [open, setOpen] = useState(false);
  if (variant === "card") return <Card />;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#cfe3b4] bg-leaf/50 px-3 py-1 text-xs font-semibold text-green-800 hover:bg-leaf"
      >
        💡 Gold da €14/mese — meno della metà di Shopify (€28)
        <span className="text-green-600">{open ? "▲ chiudi" : "vedi ▾"}</span>
      </button>
      {open && <div className="mt-2">{Card()}</div>}
    </div>
  );
}
