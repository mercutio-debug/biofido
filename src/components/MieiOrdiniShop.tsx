"use client";

import { useEffect, useState } from "react";
import {
  listMieiOrdiniShop,
  accettaContropropostaShop,
  rifiutaContropropostaShop,
  annullaOrdineShop,
  type OrdineShop,
} from "@/lib/ordini-shop";

const STATO: Record<string, { label: string; cls: string }> = {
  richiesto: { label: "In attesa dell'azienda", cls: "bg-badge-yellow text-green-900" },
  confermato: { label: "Confermato dall'azienda", cls: "bg-leaf text-green-800" },
  controproposta: { label: "L'azienda propone una modifica", cls: "bg-[#fff3d4] text-[#7a5a00]" },
  accettato: { label: "Accettato · in attesa di pagamento", cls: "bg-leaf text-green-800" },
  rifiutato: { label: "Rifiutato", cls: "bg-[#f3dada] text-traffic-red" },
  annullato: { label: "Annullato", cls: "bg-[#eee] text-green-900/60" },
  pagato: { label: "Pagato", cls: "bg-green-700 text-white" },
};

/** Sezione cliente: i propri ordini shop, con accetta/rifiuta della controproposta. */
export function MieiOrdiniShop() {
  const [ordini, setOrdini] = useState<OrdineShop[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = () => listMieiOrdiniShop().then(setOrdini);
  useEffect(() => {
    reload();
  }, []);

  async function azione(fn: () => Promise<{ error?: string }>, id: string) {
    setBusy(id);
    const { error } = await fn();
    setBusy(null);
    if (error) alert(error);
    else reload();
  }

  if (ordini === null || ordini.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="title-pangea text-2xl text-green-700">Ordini dallo shop</h2>
      <ul className="mt-4 space-y-3">
        {ordini.map((o) => {
          const s = STATO[o.stato] ?? STATO.richiesto;
          const lista = o.controproposta ?? o.articoli;
          return (
            <li key={o.id} className="rounded-2xl border border-[#e3eed7] bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-display text-lg text-green-800">{o.aziendaNome || "Azienda"}</div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${s.cls}`}>
                  {s.label}
                </span>
              </div>

              <ul className="mt-2 text-sm text-green-900/80">
                {lista.map((a, i) => (
                  <li key={i}>
                    • {a.qta}× {a.nome}
                    {a.prezzo ? ` (${a.prezzo})` : ""}
                  </li>
                ))}
              </ul>

              {o.stato === "controproposta" && (
                <div className="mt-3 rounded-xl bg-[#fff8e6] p-3">
                  <p className="text-xs text-[#7a5a00]">
                    L&apos;azienda propone le quantità qui sopra. Accetti?
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      className="btn-lime text-sm"
                      disabled={busy === o.id}
                      onClick={() => azione(() => accettaContropropostaShop(o.id), o.id)}
                    >
                      ✓ Accetta
                    </button>
                    <button
                      className="text-sm font-bold text-traffic-red hover:underline"
                      disabled={busy === o.id}
                      onClick={() => azione(() => rifiutaContropropostaShop(o.id), o.id)}
                    >
                      Rifiuta
                    </button>
                  </div>
                </div>
              )}

              {(o.stato === "confermato" || o.stato === "accettato") && (
                <p className="mt-3 rounded-xl bg-leaf/50 p-3 text-xs text-green-900/70">
                  ✓ Ordine confermato. Il pagamento sicuro sarà disponibile a breve; nel
                  frattempo l&apos;azienda ti contatterà per spedizione e dettagli.
                </p>
              )}

              {o.stato === "richiesto" && (
                <button
                  className="mt-3 text-xs font-semibold text-green-900/45 hover:text-traffic-red"
                  disabled={busy === o.id}
                  onClick={() => azione(() => annullaOrdineShop(o.id), o.id)}
                >
                  Annulla richiesta
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
