"use client";

import { useState } from "react";
import { PLAN_MAP, type Plan } from "@/lib/categories";
import { FUNZIONI, planAllows } from "@/lib/funzioni";

const ORDINE: Plan[] = ["free", "silver", "gold"];

/**
 * "Da dove parto": cursore orizzontale Free · Silver · Gold (stile come il toggle
 * mensile/annuale). Scorrendo, la legenda qui sotto ACCENDE/SPEGNE cosa puoi e
 * non puoi fare con quel piano. In fondo l'invito ad attivare l'onboarding.
 * È la leva d'upsell: mostra in chiaro cosa hai e cosa sblocchi salendo di piano.
 */
export function LegendaPianiSlider({
  activePlan,
  onScegli,
  onAttivaOnboarding,
  onboardingAttivo = false,
}: {
  activePlan: Plan;
  /** "Passa a X": seleziona davvero il piano (apre il flusso di acquisto) */
  onScegli?: (p: Plan) => void;
  /** spunta "attiva l'onboarding" */
  onAttivaOnboarding?: () => void;
  onboardingAttivo?: boolean;
}) {
  const [sel, setSel] = useState<Plan>(activePlan);
  const superiore = ORDINE.indexOf(sel) > ORDINE.indexOf(activePlan);

  return (
    <section className="card p-5 md:p-6">
      <div className="text-xs font-bold uppercase tracking-wide text-lime-500">Da dove parto</div>
      <h2 className="font-display text-2xl text-green-800">Cosa puoi fare con ogni piano</h2>
      <p className="mt-1 text-sm text-green-900/70">
        Sposta il cursore su <strong>Free · Silver · Gold</strong>: la legenda qui sotto si
        accende e si spegne mostrando cosa sblocchi.
      </p>

      {/* cursore segmentato (come il toggle mensile/annuale) */}
      <div className="mx-auto mt-4 flex max-w-sm rounded-full bg-leaf/60 p-1">
        {ORDINE.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setSel(p)}
            className={`flex-1 rounded-full px-2 py-2 text-sm font-bold transition ${
              sel === p ? "bg-green-700 text-white shadow" : "text-green-800/70 hover:text-green-800"
            }`}
          >
            {PLAN_MAP[p].label}
            {p === activePlan && <span className="ml-1 text-[10px] opacity-80">· tuo</span>}
          </button>
        ))}
      </div>
      <div className="mt-2 text-center text-sm font-semibold text-green-900/70">
        {sel === "free"
          ? "Gratis"
          : `${PLAN_MAP[sel].monthlyPrice}€ +IVA/mese · ${PLAN_MAP[sel].annualPrice}€/anno`}
      </div>

      {/* legenda funzioni, accese/spente in base al piano del cursore */}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {FUNZIONI.map((f) => {
          const ok = planAllows(sel, f.minPlan);
          return (
            <div
              key={f.label}
              className={`flex items-start gap-2 rounded-xl border p-2.5 transition ${
                ok ? "border-[#cfe3b4] bg-leaf/30" : "border-[#ece9df] bg-[#f7f7f3] opacity-75"
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full text-[11px] font-bold ${
                  ok ? "bg-green-600 text-white" : "bg-[#e0ddd2] text-[#8a8778]"
                }`}
              >
                {ok ? "✓" : "🔒"}
              </span>
              <div className="min-w-0">
                <div className={`text-sm font-semibold ${ok ? "text-green-800" : "text-green-900/45"}`}>
                  {f.label}
                </div>
                <div className={`text-xs ${ok ? "text-green-900/65" : "text-green-900/40"}`}>
                  {ok ? f.descr : `Si sblocca con ${PLAN_MAP[f.minPlan].label}`}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA di upgrade quando guardi un piano più alto del tuo */}
      {superiore && onScegli && (
        <button onClick={() => onScegli(sel)} className="btn-lime mt-4 w-full justify-center">
          Passa a {PLAN_MAP[sel].label} e sblocca tutto ↑
        </button>
      )}

      {/* onboarding "Ci pensiamo noi" in fondo */}
      <label
        className={`mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 ${
          onboardingAttivo ? "border-[#9fcd6f] bg-leaf/40" : "border-badge-yellow bg-[#fffbe9]"
        }`}
      >
        <input
          type="checkbox"
          checked={onboardingAttivo}
          onChange={() => {
            if (!onboardingAttivo) onAttivaOnboarding?.();
          }}
          className="h-6 w-6 flex-none accent-[#d99a00]"
        />
        <span>
          <span className="font-display text-base text-[#7a5b00]">
            {onboardingAttivo ? "✓ Onboarding attivato" : "Non hai tempo? Attiva l'onboarding!"}
          </span>
          <span className="mt-0.5 block text-xs text-[#8a6f2e]">
            {onboardingAttivo
              ? "Lo trovi nel menu «Servizi attivi». Pensiamo noi al tuo negozio."
              : "Ci mandi listino e foto, costruiamo noi il tuo negozio «chiavi in mano» (col piano Gold)."}
          </span>
        </span>
      </label>
    </section>
  );
}
