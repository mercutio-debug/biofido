"use client";

import { useEffect, useState } from "react";
import {
  loadOrdiniRicevuti,
  accettaOrdine,
  rifiutaOrdine,
  setStatoOrdine,
  type Ordine,
} from "@/lib/ordini";

const euro = (c: number) =>
  (c / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" });

const STATO: Record<string, { label: string; cls: string }> = {
  richiesto: { label: "Da accettare", cls: "bg-badge-yellow text-green-900" },
  pagato: { label: "Pagato", cls: "bg-leaf text-green-800" },
  spedito: { label: "Spedito", cls: "bg-leaf text-green-800" },
  consegnato: { label: "Consegnato", cls: "bg-leaf text-green-800" },
  rifiutato: { label: "Rifiutato", cls: "bg-[#f3dada] text-traffic-red" },
  annullato: { label: "Annullato", cls: "bg-[#eee] text-green-900/60" },
};

export default function OrdiniRicevutiPage() {
  const [ordini, setOrdini] = useState<Ordine[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function reload() {
    setOrdini(await loadOrdiniRicevuti());
  }
  useEffect(() => {
    reload();
  }, []);

  async function azione(fn: () => Promise<{ error?: string }>, id: string) {
    setBusy(id);
    setErr(null);
    const { error } = await fn();
    setBusy(null);
    if (error) setErr(error);
    else reload();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="title-pangea text-4xl text-green-700">Ordini ricevuti</h1>
      <p className="mt-2 text-green-900/75">
        Accetta un ordine per <strong>addebitare</strong> il pagamento autorizzato dal
        cliente, oppure rifiutalo per rilasciare i fondi.
      </p>

      {err && <p className="mt-4 text-sm font-semibold text-traffic-red">{err}</p>}

      {ordini === null ? (
        <p className="mt-8 text-green-900/60">Caricamento…</p>
      ) : ordini.length === 0 ? (
        <p className="mt-8 rounded-xl bg-leaf p-5 text-green-900/75">
          Non hai ancora ricevuto ordini.
        </p>
      ) : (
        <div className="mt-8 space-y-4">
          {ordini.map((o) => {
            const st = STATO[o.stato] ?? { label: o.stato, cls: "bg-[#eee]" };
            return (
              <div key={o.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-display text-lg text-green-800">
                      {o.cliente_nome} · {o.quantita}×
                    </div>
                    <div className="text-sm text-green-900/70">
                      {o.cliente_email}
                      {o.cliente_tel ? ` · ${o.cliente_tel}` : ""}
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${st.cls}`}>
                    {st.label}
                  </span>
                </div>

                <div className="mt-3 rounded-xl bg-leaf/50 p-3 text-sm text-green-900/80">
                  {o.modalita === "spedizione" ? (
                    <>
                      <strong>Spedizione:</strong> {o.spedizione_indirizzo}, {o.spedizione_cap}{" "}
                      {o.spedizione_citta} {o.spedizione_prov}
                    </>
                  ) : (
                    <strong>Ritiro in azienda</strong>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="font-display text-xl text-green-700">
                    {euro(o.totale_cents)}
                  </span>
                  <div className="flex gap-2">
                    {o.stato === "richiesto" && (
                      <>
                        <button
                          className="btn-lime"
                          disabled={busy === o.id}
                          onClick={() => azione(() => accettaOrdine(o.id), o.id)}
                        >
                          {busy === o.id ? "…" : "Accetta"}
                        </button>
                        <button
                          className="rounded-full border border-traffic-red px-4 py-2 text-sm font-bold text-traffic-red disabled:opacity-50"
                          disabled={busy === o.id}
                          onClick={() => azione(() => rifiutaOrdine(o.id), o.id)}
                        >
                          Rifiuta
                        </button>
                      </>
                    )}
                    {o.stato === "pagato" && (
                      <button
                        className="btn-lime"
                        disabled={busy === o.id}
                        onClick={() => azione(() => setStatoOrdine(o.id, "spedito"), o.id)}
                      >
                        Segna spedito
                      </button>
                    )}
                    {o.stato === "spedito" && (
                      <button
                        className="btn-lime"
                        disabled={busy === o.id}
                        onClick={() => azione(() => setStatoOrdine(o.id, "consegnato"), o.id)}
                      >
                        Segna consegnato
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
