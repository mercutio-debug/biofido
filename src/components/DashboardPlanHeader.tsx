"use client";

import { useEffect, useState } from "react";
import { caricaDatiBio } from "@/lib/bio";

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
  useEffect(() => {
    caricaDatiBio().then((d) => setIsBio(!!d?.is_bio));
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
    <div
      className={`mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 px-5 py-4 shadow-sm ${stile}`}
    >
      <div className="flex items-center gap-3">
        <span className="font-display text-2xl tracking-wide md:text-3xl">{etichetta}</span>
        {plan !== "free" && (
          <span className="rounded-full bg-white/40 px-3 py-0.5 text-xs font-bold">
            abbonamento attivo
          </span>
        )}
      </div>
      {mostraCross && (
        <a
          href={crossUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-white/70 px-4 py-2 text-sm font-bold text-green-800 hover:bg-white"
        >
          {crossLabel ?? "Vai →"}
        </a>
      )}
    </div>
  );
}
