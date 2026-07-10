"use client";

import {
  livelloMagazzino,
  COLORE_MAGAZZINO,
  ETICHETTA_MAGAZZINO,
} from "@/lib/magazzino";

/** Una riga di magazzino, normalizzata dalla dashboard (BioFido/ECO-VISA). */
export type VoceMagazzino = {
  nome: string;
  giacenza: number | null | undefined;
  iniziale: number | null | undefined;
};

/**
 * Sezione «Magazzino»: tabella nome articolo + quantità a magazzino, con pallino
 * di livello scorta (verde piena → rosso da riordinare). Mostra solo i prodotti
 * che gestiscono la giacenza (shop, Gold); gli altri hanno scorta illimitata.
 * Le scorte si aggiornano da sole a ogni vendita (webhook).
 */
export function MagazzinoCard({ voci }: { voci: VoceMagazzino[] }) {
  const gestiti = voci.filter((v) => v.giacenza != null);
  return (
    <section className="card p-5 md:p-6">
      <h2 className="font-display text-2xl text-green-800">📦 Magazzino</h2>
      <p className="mt-1 text-sm text-green-900/70">
        Quante unità hai in magazzino di ogni prodotto. Il pallino diventa più
        allarmante man mano che la scorta cala; le quantità si aggiornano da sole a
        ogni vendita.
      </p>

      {gestiti.length === 0 ? (
        <p className="mt-4 rounded-xl bg-leaf/40 p-4 text-sm text-green-900/70">
          Nessun prodotto con giacenza gestita. Per vederlo qui, attiva la scorta di
          un prodotto nello shop (piano Gold): in «Prodotti &amp; semaforo» imposta la
          quantità disponibile.
        </p>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto rounded-xl border border-[#e3eed7]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-leaf/40 text-left text-green-900/70">
                  <th className="px-4 py-2 font-semibold">Articolo</th>
                  <th className="px-4 py-2 text-right font-semibold">In magazzino</th>
                  <th className="px-4 py-2 text-right font-semibold">Stato</th>
                </tr>
              </thead>
              <tbody>
                {gestiti.map((v, i) => {
                  const liv = livelloMagazzino(v.giacenza, v.iniziale) ?? "verde";
                  return (
                    <tr key={i} className="border-t border-[#eef4e6]">
                      <td className="px-4 py-2 font-semibold text-green-800">
                        {v.nome || "(senza nome)"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-green-900">
                        {v.giacenza}
                        {v.iniziale != null && v.iniziale > 0 && (
                          <span className="text-green-900/45"> / {v.iniziale}</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <span className="flex items-center justify-end gap-2">
                          <span className="text-xs text-green-900/60">
                            {ETICHETTA_MAGAZZINO[liv]}
                          </span>
                          <span
                            className="h-2.5 w-2.5 flex-none rounded-full"
                            style={{ background: COLORE_MAGAZZINO[liv] }}
                          />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-green-900/55">
            Per rifornire, apri il prodotto in «Prodotti &amp; semaforo» e aggiorna la
            quantità disponibile: quel valore diventa la nuova scorta piena di
            riferimento del pallino.
          </p>
        </>
      )}
    </section>
  );
}
