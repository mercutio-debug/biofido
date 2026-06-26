"use client";

import { useState } from "react";

/**
 * Quanti alberi servono per compensare la CO₂ di trasporto del prodotto.
 * Riferimento: 1 albero assorbe ~22 kg di CO₂ l'anno (le citate "48 lb/anno",
 * fonte One Tree Planted; media tra specie ~24 kg). Costante modificabile.
 */
export const KG_CO2_PER_ALBERO_ANNO = 22;

function Albero() {
  return (
    <svg width={14} height={18} viewBox="0 0 14 18" aria-hidden>
      <rect x="6" y="12" width="2" height="5" rx="0.5" fill="#8a5a2b" />
      <circle cx="7" cy="6" r="5" fill="#4a8f1e" />
      <circle cx="4" cy="9" r="3" fill="#5baf38" />
      <circle cx="10" cy="9" r="3" fill="#5baf38" />
    </svg>
  );
}

const MAX_ICONE = 120;

export function AlberiCompensazione({
  co2Kg,
  scuro = false,
}: {
  co2Kg: number;
  /** true se sta su sfondo scuro (es. pannello del calcolatore) */
  scuro?: boolean;
}) {
  const [aperto, setAperto] = useState(false);
  if (co2Kg <= 0) return null;

  const alberi = Math.max(1, Math.ceil(co2Kg / KG_CO2_PER_ALBERO_ANNO));
  const mostrate = Math.min(alberi, MAX_ICONE);

  if (!aperto) {
    return (
      <button
        onClick={() => setAperto(true)}
        className={`mt-3 text-left text-xs font-semibold underline ${
          scuro ? "text-lime-300 hover:text-lime-200" : "text-green-700 hover:text-lime-500"
        }`}
      >
        🌳 Vuoi sapere quanti alberi ci vogliono per compensare questa CO₂?
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-[#cfe3b4] bg-white p-3 text-green-900">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-green-800">
          ≈ {alberi.toLocaleString("it-IT")} {alberi === 1 ? "albero" : "alberi"}{" "}
          <span className="font-normal text-green-900/60">per un anno</span>
        </div>
        <button
          onClick={() => setAperto(false)}
          className="text-xs font-semibold text-green-700 hover:underline"
        >
          chiudi
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-0.5">
        {Array.from({ length: mostrate }).map((_, i) => (
          <Albero key={i} />
        ))}
        {alberi > MAX_ICONE && (
          <span className="self-end text-[11px] font-semibold text-green-900/60">
            +{(alberi - MAX_ICONE).toLocaleString("it-IT")}
          </span>
        )}
      </div>
      <p className="mt-2 text-[11px] text-green-900/55">
        Stima: 1 albero assorbe ~{KG_CO2_PER_ALBERO_ANNO} kg di CO₂ l&apos;anno
        (fonte: One Tree Planted, media tra specie).
      </p>
    </div>
  );
}
