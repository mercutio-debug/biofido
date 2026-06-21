"use client";

import { useEffect, useState } from "react";
import { loadMieiOrdini, type Ordine } from "@/lib/ordini";

const euro = (c: number) =>
  (c / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" });

const STATO: Record<string, { label: string; cls: string }> = {
  richiesto: { label: "In attesa dell'azienda", cls: "bg-badge-yellow text-green-900" },
  pagato: { label: "Pagato · in preparazione", cls: "bg-leaf text-green-800" },
  spedito: { label: "Spedito", cls: "bg-leaf text-green-800" },
  consegnato: { label: "Consegnato", cls: "bg-leaf text-green-800" },
  rifiutato: { label: "Rifiutato · nessun addebito", cls: "bg-[#f3dada] text-traffic-red" },
  annullato: { label: "Annullato", cls: "bg-[#eee] text-green-900/60" },
};

export default function MieiOrdiniPage() {
  const [ordini, setOrdini] = useState<Ordine[] | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    loadMieiOrdini().then(setOrdini);
    const p = new URLSearchParams(window.location.search).get("pagamento");
    if (p === "autorizzato")
      setBanner(
        "Pagamento autorizzato! L'importo verrà addebitato solo quando l'azienda accetta l'ordine.",
      );
    else if (p === "annullato") setBanner("Pagamento annullato.");
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="title-pangea text-4xl text-green-700">I miei ordini</h1>

      {banner && (
        <p className="mt-4 rounded-xl bg-leaf p-4 text-sm font-semibold text-green-700">
          {banner}
        </p>
      )}

      {ordini === null ? (
        <p className="mt-8 text-green-900/60">Caricamento…</p>
      ) : ordini.length === 0 ? (
        <p className="mt-8 rounded-xl bg-leaf p-5 text-green-900/75">
          Non hai ancora effettuato ordini.
        </p>
      ) : (
        <div className="mt-8 space-y-4">
          {ordini.map((o) => {
            const st = STATO[o.stato] ?? { label: o.stato, cls: "bg-[#eee]" };
            return (
              <div key={o.id} className="card flex items-center justify-between gap-3 p-5">
                <div>
                  <div className="font-display text-lg text-green-800">
                    {o.quantita}× · {euro(o.totale_cents)}
                  </div>
                  <div className="text-sm text-green-900/70">
                    {o.modalita === "spedizione" ? "Spedizione" : "Ritiro"} ·{" "}
                    {new Date(o.created_at).toLocaleDateString("it-IT")}
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${st.cls}`}>
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
