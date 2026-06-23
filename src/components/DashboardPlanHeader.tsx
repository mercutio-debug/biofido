"use client";

import { useEffect, useState } from "react";
import { caricaDatiBio } from "@/lib/bio";
import { getMyScadenza } from "@/lib/plan";

/**
 * Intestazione della dashboard col piano dell'azienda BEN VISIBILE (cornice oro
 * per il Gold, argento per il Silver), così si capisce a colpo d'occhio. Se
 * l'azienda è iscritta come produttore bio, mostra anche il tasto cross-portale
 * (es. «Vai su BioFido»).
 */
export function DashboardPlanHeader({
  plan,
  crossUrl,
  crossLabel,
  crossSeBio = false,
}: {
  plan: "free" | "silver" | "gold";
  crossUrl?: string;
  crossLabel?: string;
  /** se true, il tasto cross-portale appare solo per i produttori bio */
  crossSeBio?: boolean;
}) {
  const [isBio, setIsBio] = useState(false);
  const [scadenza, setScadenza] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  useEffect(() => {
    caricaDatiBio().then((d) => setIsBio(!!d?.is_bio));
    getMyScadenza().then(setScadenza);
  }, []);

  const stile =
    plan === "gold"
      ? "bg-gradient-to-r from-[#f6d54a] to-[#d9a400] text-[#5a3e00] border-[#caa100]"
      : plan === "silver"
        ? "bg-gradient-to-r from-[#e3e9ee] to-[#aab6bf] text-[#33414a] border-[#9aa6af]"
        : "bg-leaf text-green-800 border-[#cfe0bb]";
  const etichetta =
    plan === "gold" ? "★ AZIENDA GOLD" : plan === "silver" ? "AZIENDA SILVER" : "PIANO FREE";

  const mostraCross = crossUrl && (crossSeBio ? isBio : true);

  return (
    <>
    <div
      className={`mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 px-5 py-4 shadow-sm ${stile}`}
    >
      <div>
        <div className="flex items-center gap-3">
          <span className="font-display text-2xl tracking-wide md:text-3xl">{etichetta}</span>
          {plan !== "free" && (
            <span className="rounded-full bg-white/40 px-3 py-0.5 text-xs font-bold">
              abbonamento attivo
            </span>
          )}
        </div>
        {plan !== "free" && scadenza && (
          <div className="mt-1 text-xs font-semibold opacity-80">
            Rinnovo / scadenza: {new Date(scadenza).toLocaleDateString("it-IT")}
          </div>
        )}
      </div>
      {mostraCross && (
        <button
          type="button"
          onClick={() => setShowInfo(true)}
          className="rounded-full bg-white/70 px-4 py-2 text-sm font-bold text-green-800 hover:bg-white"
        >
          {crossLabel ?? "Vai →"}
        </button>
      )}
    </div>

    {showInfo && crossUrl && (
      <div
        className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/45 p-4"
        onClick={() => setShowInfo(false)}
      >
        <div className="card max-w-md p-6" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-display text-2xl text-green-800">Portale gemello 🐾🌐</h3>
          <p className="mt-3 text-sm text-green-900/85">
            <strong>BioFido</strong> è il sito <strong>gemello</strong> di questo portale.
            Per entrare nella tua dashboard ti basta accedere con le{" "}
            <strong>stesse credenziali</strong> (stessa email e password di questo account):
            non serve registrarsi di nuovo.
          </p>
          <p className="mt-2 text-sm text-green-900/85">
            E quando aggiorni la tua scheda — non importa su quale dei due portali — i dati
            si aggiornano <strong>su entrambi</strong> automaticamente: account e scheda
            azienda sono condivisi.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <a
              href={crossUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setShowInfo(false)}
              className="btn-lime flex-1 justify-center"
            >
              {crossLabel ?? "Continua →"}
            </a>
            <button
              type="button"
              onClick={() => setShowInfo(false)}
              className="btn-ghost flex-1 justify-center"
            >
              Annulla
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
