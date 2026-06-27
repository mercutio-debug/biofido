"use client";

import { useEffect, useState } from "react";
import { vaiAlPannello } from "./DashboardShell";

/**
 * Promozioni a tempo nella dashboard, poco invasive: un toast in basso a destra,
 * dismissibile e mostrato UNA volta a sessione. Dopo 1 minuto invita ai piani;
 * dopo 3 minuti propone la community/onboarding. I Gold non vengono disturbati.
 */
type Kind = "piani" | "community";

export function PromoTimer({ plan }: { plan: string }) {
  const [show, setShow] = useState<Kind | null>(null);

  useEffect(() => {
    if (plan === "gold") return; // chi è già al massimo non viene disturbato
    const timers: number[] = [];
    try {
      if (!sessionStorage.getItem("promo_piani"))
        timers.push(window.setTimeout(() => setShow((s) => s ?? "piani"), 60_000));
      if (!sessionStorage.getItem("promo_community"))
        timers.push(window.setTimeout(() => setShow((s) => s ?? "community"), 180_000));
    } catch {}
    return () => timers.forEach((t) => clearTimeout(t));
  }, [plan]);

  if (!show) return null;
  const piani = show === "piani";

  function chiudi() {
    try {
      sessionStorage.setItem(piani ? "promo_piani" : "promo_community", "1");
    } catch {}
    setShow(null);
  }

  return (
    <div className="fixed bottom-4 right-4 z-[3000] w-[min(92vw,340px)] rounded-2xl border-2 border-[#cfe3b4] bg-white p-4 shadow-2xl">
      <button
        type="button"
        onClick={chiudi}
        aria-label="Chiudi"
        className="absolute right-2.5 top-2.5 text-lg leading-none text-green-900/40 hover:text-green-900"
      >
        ✕
      </button>
      <div className="text-2xl">{piani ? "🚀" : "🌱"}</div>
      <div className="mt-1 font-display text-lg text-green-800">
        {piani ? "Fai crescere la tua vetrina" : "Non hai tempo? Ci pensiamo noi"}
      </div>
      <p className="mt-1 text-sm text-green-900/70">
        {piani
          ? "Con Silver e Gold sblocchi più prodotti, la vendita online e la massima visibilità — da €9/mese."
          : "Con il Gold + onboarding costruiamo noi il tuo negozio «chiavi in mano»: tu pensi alla tua azienda."}
      </p>
      <button
        type="button"
        onClick={() => {
          chiudi();
          if (piani) {
            window.dispatchEvent(new CustomEvent("dash:tendina", { detail: "piani" }));
            window.scrollTo({ top: 0, behavior: "smooth" });
          } else {
            vaiAlPannello("extra");
          }
        }}
        className="btn-lime mt-3 w-full justify-center text-sm"
      >
        {piani ? "Scopri i piani →" : "Scopri «Ci pensiamo noi» →"}
      </button>
    </div>
  );
}
