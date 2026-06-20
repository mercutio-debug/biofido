"use client";

import { useEffect, useState } from "react";
import { caricaStatistiche, type Statistiche } from "@/lib/statistiche";
import { PLAN_MAP, type Plan } from "@/lib/categories";

function Numero({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-2xl bg-leaf/40 p-4 text-center">
      <div className="font-display text-3xl text-green-700">{n.toLocaleString("it-IT")}</div>
      <div className="text-xs font-semibold text-green-900/65">{label}</div>
    </div>
  );
}

/**
 * Statistiche di visita della scheda. Bloccate nel piano Free; base nel piano
 * Silver (numeri); avanzate nel piano Gold (numeri + andamento 30 giorni).
 */
export function StatisticheCard({ ownerId, plan }: { ownerId: string; plan: Plan }) {
  const livello = PLAN_MAP[plan].statsLevel; // "none" | "base" | "advanced"
  const [s, setS] = useState<Statistiche | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (livello === "none") {
      setLoading(false);
      return;
    }
    caricaStatistiche(ownerId).then((r) => {
      setS(r);
      setLoading(false);
    });
  }, [ownerId, livello]);

  if (livello === "none") {
    return (
      <section className="card mt-6 p-6">
        <h2 className="font-display text-2xl text-green-800">📊 Statistiche</h2>
        <p className="mt-1 text-sm text-green-900/70">
          Le statistiche di visita della tua scheda si sbloccano dal piano{" "}
          <strong>Silver</strong> (base) e <strong>Gold</strong> (avanzate, con
          l&apos;andamento giorno per giorno).
        </p>
      </section>
    );
  }

  const max = s ? Math.max(1, ...s.perGiorno.map((d) => d.n)) : 1;

  return (
    <section className="card mt-6 p-6">
      <h2 className="font-display text-2xl text-green-800">
        📊 Statistiche {livello === "advanced" ? "(avanzate)" : "(base)"}
      </h2>
      <p className="mt-1 text-sm text-green-900/70">
        Quante persone hanno aperto la tua scheda su BioFido.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-green-900/60">Carico le statistiche…</p>
      ) : s ? (
        <>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Numero n={s.totale} label="Visite totali" />
            <Numero n={s.ultimi7} label="Ultimi 7 giorni" />
            <Numero n={s.ultimi30} label="Ultimi 30 giorni" />
          </div>

          {livello === "advanced" && (
            <>
              <div className="mt-6">
                <div className="label mb-2">Andamento ultimi 30 giorni</div>
                <div className="flex h-28 items-end gap-[3px]">
                  {s.perGiorno.map((d) => (
                    <div
                      key={d.giorno}
                      title={`${d.giorno}: ${d.n} visite`}
                      style={{ height: `${Math.max(3, (d.n / max) * 100)}%` }}
                      className="flex-1 rounded-t bg-green-600/80 transition hover:bg-green-700"
                    />
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-green-900/45">
                  <span>30 giorni fa</span>
                  <span>oggi</span>
                </div>
              </div>

              {/* azioni dei visitatori */}
              <div className="mt-6">
                <div className="label mb-2">Azioni dei visitatori (ultimi 30 giorni)</div>
                <div className="grid grid-cols-2 gap-3">
                  <Numero n={s.azioni.indicazioni} label="Clic su «Raggiungila»" />
                  <Numero n={s.azioni.contatto} label="Clic su contatti" />
                </div>
              </div>

              {/* provenienza dei visitatori */}
              <div className="mt-6">
                <div className="label mb-2">Da dove ti cercano (ultimi 30 giorni)</div>
                {s.provenienza.length === 0 ? (
                  <p className="text-sm text-green-900/60">
                    Ancora pochi dati sulla provenienza dei visitatori.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {s.provenienza.map((p) => (
                      <li key={p.zona} className="flex items-center gap-2 text-sm">
                        <span className="w-28 shrink-0 truncate text-green-900/80">{p.zona}</span>
                        <span className="h-2 flex-1 rounded-full bg-leaf">
                          <span
                            className="block h-2 rounded-full bg-green-600"
                            style={{ width: `${(p.n / s.provenienza[0].n) * 100}%` }}
                          />
                        </span>
                        <span className="w-8 shrink-0 text-right font-semibold text-green-800">
                          {p.n}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {s.totale === 0 && (
            <p className="mt-4 rounded-xl bg-leaf/40 p-3 text-sm text-green-900/65">
              Ancora nessuna visita registrata. Appena qualcuno apre la tua scheda
              dalla mappa, lo vedrai qui.
            </p>
          )}
        </>
      ) : null}
    </section>
  );
}
