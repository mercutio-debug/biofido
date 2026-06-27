"use client";

import { useEffect, useState } from "react";
import {
  listOrdiniRicevutiShop,
  confermaOrdineShop,
  rifiutaOrdineShop,
  controproponiOrdineShop,
  segnaOrdineSpedito,
  type OrdineShop,
  type ArticoloOrdine,
} from "@/lib/ordini-shop";

const STATO: Record<string, { label: string; cls: string }> = {
  richiesto: { label: "Nuovo · da confermare", cls: "bg-badge-yellow text-green-900" },
  confermato: { label: "Confermato", cls: "bg-leaf text-green-800" },
  controproposta: { label: "Controproposta inviata", cls: "bg-[#fff3d4] text-[#7a5a00]" },
  accettato: { label: "Accettato dal cliente", cls: "bg-leaf text-green-800" },
  rifiutato: { label: "Rifiutato", cls: "bg-[#f3dada] text-traffic-red" },
  annullato: { label: "Annullato", cls: "bg-[#eee] text-green-900/60" },
  pagato: { label: "Pagato · da spedire", cls: "bg-green-700 text-white" },
  spedito: { label: "Spedito ✓", cls: "bg-green-800 text-white" },
};

/** Card dashboard: ordini ricevuti dallo shop, con conferma/controproposta/rifiuto. */
export function OrdiniShopRicevuti() {
  const [ordini, setOrdini] = useState<OrdineShop[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [edit, setEdit] = useState<string | null>(null);
  const [bozza, setBozza] = useState<ArticoloOrdine[]>([]);

  const reload = () => listOrdiniRicevutiShop().then(setOrdini);
  useEffect(() => {
    reload();
  }, []);

  async function azione(fn: () => Promise<{ error?: string }>, id: string) {
    setBusy(id);
    const { error } = await fn();
    setBusy(null);
    if (error) alert(error);
    else {
      setEdit(null);
      reload();
    }
  }

  if (ordini === null) return null;

  return (
    <section className="card mt-6 p-6">
      <h2 className="font-display text-2xl text-green-800">🛒 Ordini ricevuti (shop)</h2>
      <p className="mt-1 text-sm text-green-900/70">
        Quando un cliente ordina i tuoi prodotti, l&apos;ordine arriva qui: confermalo,
        oppure proponi un&apos;alternativa sulle quantità se qualcosa non è disponibile.
      </p>

      {ordini.length === 0 ? (
        <p className="mt-4 rounded-xl bg-leaf/40 p-4 text-sm text-green-900/70">
          Nessun ordine per ora.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {ordini.map((o) => {
            const s = STATO[o.stato] ?? STATO.richiesto;
            return (
              <li key={o.id} className="rounded-2xl border border-[#e3eed7] bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-green-800">
                    {o.clienteNome || o.clienteEmail || "Cliente"}
                    {o.clienteEmail && (
                      <span className="ml-1 font-normal text-green-900/55">· {o.clienteEmail}</span>
                    )}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${s.cls}`}>
                    {s.label}
                  </span>
                </div>

                <ul className="mt-2 text-sm text-green-900/80">
                  {o.articoli.map((a, i) => (
                    <li key={i}>
                      • {a.qta}× {a.nome}
                      {a.prezzo ? ` (${a.prezzo})` : ""}
                    </li>
                  ))}
                </ul>

                {/* dati del cliente: servono all'azienda per emettere fattura e spedire */}
                <div className="mt-3 rounded-xl bg-leaf/40 p-3 text-xs text-green-900/85">
                  <div className="font-bold uppercase tracking-wide text-green-700">
                    Dati cliente — per fattura e spedizione
                  </div>
                  <div className="mt-1 space-y-0.5">
                    <div>👤 {o.clienteNome || "—"}</div>
                    <div>✉️ {o.clienteEmail || "—"}</div>
                    <div>🧾 CF: {o.codiceFiscale || "— (non fornito)"}</div>
                    <div>📞 {o.telefono || "— (non fornito)"}</div>
                    <div>📍 {o.indirizzoSpedizione || "— (indirizzo non fornito)"}</div>
                  </div>
                </div>

                {o.controproposta && (
                  <div className="mt-2 rounded-xl bg-[#fff8e6] p-2 text-xs text-[#7a5a00]">
                    Controproposta inviata:{" "}
                    {o.controproposta.map((a) => `${a.qta}× ${a.nome}`).join(", ")}
                  </div>
                )}

                {/* azioni: solo su ordine nuovo */}
                {o.stato === "richiesto" && edit !== o.id && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className="btn-lime text-sm"
                      disabled={busy === o.id}
                      onClick={() => azione(() => confermaOrdineShop(o.id), o.id)}
                    >
                      ✓ Conferma ordine
                    </button>
                    <button
                      className="btn-ghost text-sm"
                      onClick={() => {
                        setEdit(o.id);
                        setBozza(o.articoli.map((a) => ({ ...a })));
                      }}
                    >
                      ✎ Controproposta
                    </button>
                    <button
                      className="text-sm font-bold text-traffic-red hover:underline"
                      disabled={busy === o.id}
                      onClick={() => azione(() => rifiutaOrdineShop(o.id), o.id)}
                    >
                      Rifiuta
                    </button>
                  </div>
                )}

                {/* ordine pagato: l'azienda lo segna come spedito → avvisa il cliente */}
                {o.stato === "pagato" && (
                  <div className="mt-3">
                    <button
                      className="btn-lime text-sm"
                      disabled={busy === o.id}
                      onClick={() => azione(() => segnaOrdineSpedito(o.id), o.id)}
                    >
                      📦 Segna come spedito
                    </button>
                  </div>
                )}

                {/* editor controproposta */}
                {edit === o.id && (
                  <div className="mt-3 rounded-xl bg-leaf/50 p-3">
                    <div className="text-xs font-bold uppercase tracking-wide text-green-700">
                      Proponi nuove quantità
                    </div>
                    <ul className="mt-2 space-y-2">
                      {bozza.map((a, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <span className="flex-1 truncate text-green-900/80">{a.nome}</span>
                          <input
                            type="number"
                            min={0}
                            value={a.qta}
                            onChange={(e) =>
                              setBozza((prev) =>
                                prev.map((x, idx) =>
                                  idx === i ? { ...x, qta: Math.max(0, Number(e.target.value)) } : x,
                                ),
                              )
                            }
                            className="field h-9 w-20 py-1"
                          />
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex gap-2">
                      <button
                        className="btn-lime text-sm"
                        disabled={busy === o.id}
                        onClick={() =>
                          azione(
                            () => controproponiOrdineShop(o.id, bozza.filter((a) => a.qta > 0)),
                            o.id,
                          )
                        }
                      >
                        Invia controproposta
                      </button>
                      <button className="btn-ghost text-sm" onClick={() => setEdit(null)}>
                        Annulla
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
