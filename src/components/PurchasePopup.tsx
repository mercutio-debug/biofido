"use client";

import { useEffect, useState } from "react";
import { SERVIZI_EXTRA } from "@/lib/servizi-extra";
import {
  isExtraScelto,
  toggleExtraScelto,
  getExtraScelti,
  onExtraChange,
} from "@/lib/extra-selezionati";
import { startCheckout } from "@/lib/billing";

/** Servizi attivabili per piano (onboarding solo Gold). */
const SERVIZI_PER_PIANO: Record<string, string[]> = {
  free: [],
  silver: ["report", "badge"],
  gold: ["onboarding", "report", "badge"],
};

const euro = (n: number) =>
  "€ " +
  n.toLocaleString("it-IT", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });

/**
 * Popup-carrello del pagamento: appare quando l'azienda sceglie un piano. È un
 * reminder («hai scelto X, vai al pagamento o continua e paga alla fine») e
 * permette di aggiungere i servizi extra spuntandoli, mostrando il TOTALE
 * aggiornato. «Vai al pagamento» apre Stripe (piano + extra insieme).
 */
export function PurchasePopup({
  plan,
  period,
  planLabel,
  planPrice,
  onClose,
}: {
  plan: "free" | "silver" | "gold";
  period: "monthly" | "annual";
  planLabel: string;
  planPrice: number;
  onClose: () => void;
}) {
  const [, force] = useState(0);
  useEffect(() => onExtraChange(() => force((n) => n + 1)), []);
  const [paying, setPaying] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const ammessi = SERVIZI_PER_PIANO[plan] ?? [];
  const selezionati = SERVIZI_EXTRA.filter(
    (s) => ammessi.includes(s.key) && isExtraScelto(s.key),
  );
  const totaleExtra = selezionati.reduce((t, s) => t + (s.prezzoNum || 0), 0);
  const totale = planPrice + totaleExtra;

  async function paga() {
    setPaying(true);
    setErr(null);
    try {
      await startCheckout(plan as "silver" | "gold", period, getExtraScelti());
    } catch (e) {
      setErr((e as Error).message);
      setPaying(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="card max-h-[92vh] w-full max-w-lg overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-lime-500">
              🛒 Il tuo carrello
            </div>
            <h3 className="font-display text-2xl text-green-800">
              Hai scelto il piano {planLabel}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Chiudi"
            className="text-2xl leading-none text-green-900/50 hover:text-green-900"
          >
            ×
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-leaf/50 p-3">
          <span className="font-semibold text-green-800">
            Abbonamento {planLabel} · {period === "annual" ? "annuale" : "mensile"}
          </span>
          <span className="font-display text-lg text-green-700">{euro(planPrice)}</span>
        </div>

        {ammessi.length > 0 && (
          <>
            <div className="mt-4 text-sm font-bold text-green-800">
              Aggiungi i servizi extra:
            </div>
            <div className="mt-2 space-y-2">
              {SERVIZI_EXTRA.filter((s) => ammessi.includes(s.key)).map((s) => {
                const on = isExtraScelto(s.key);
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => toggleExtraScelto(s.key)}
                    aria-pressed={on}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border-2 p-3 text-left transition ${
                      on ? "border-lime-500 bg-leaf/60" : "border-[#e3eed7] bg-white"
                    }`}
                  >
                    <span className="font-semibold text-green-800">
                      {on ? "✓ " : "+ "}
                      {s.emoji} {s.nome}
                    </span>
                    <span className="shrink-0 text-sm font-bold text-green-700">
                      {euro(s.prezzoNum)}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div className="mt-4 flex items-center justify-between rounded-xl bg-green-700 px-4 py-3 text-white">
          <span className="font-semibold">Totale</span>
          <span className="font-display text-2xl">{euro(totale)}</span>
        </div>
        <p className="mt-1 text-[11px] text-green-900/55">
          Abbonamento ricorrente ({period === "annual" ? "annuale" : "mensile"}) + servizi
          extra addebitati una volta sulla prima fattura. IVA esclusa.
        </p>

        {err && <p className="mt-3 text-sm font-semibold text-traffic-red">{err}</p>}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={paga}
            disabled={paying}
            className="btn-lime flex-1 justify-center"
          >
            {paying ? "Apro Stripe…" : "Vai al pagamento"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost flex-1 justify-center"
          >
            Continua a completare la tua scheda
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-green-900/55">
          Puoi pagare anche più tardi: i servizi connessi si attivano dopo il pagamento.
        </p>
      </div>
    </div>
  );
}
