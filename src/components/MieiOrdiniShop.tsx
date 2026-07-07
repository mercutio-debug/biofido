"use client";

import { useEffect, useState } from "react";
import {
  listMieiOrdiniShop,
  pagaOrdineShop,
  verificaOrdineShop,
  numeroOrdineFmt,
  dataOraOrdine,
  type OrdineShop,
} from "@/lib/ordini-shop";

// stato → etichetta badge + colore box + messaggio al cliente
const STATO: Record<
  string,
  { label: string; cls: string; box: string; msg?: string }
> = {
  autorizzato: {
    label: "💳 Pagato · in attesa di conferma",
    cls: "bg-badge-yellow text-green-900",
    box: "border-[#e6dca6] bg-[#fffdf3]",
    msg: "Hai pagato: l'importo resta bloccato (non addebitato) finché l'azienda non conferma l'ordine.",
  },
  confermato: {
    label: "✓ Confermato",
    cls: "bg-green-700 text-white",
    box: "border-green-300 bg-leaf/40",
    msg: "Siamo in attesa che l'azienda spedisca il tuo ordine.",
  },
  spedito: {
    label: "📦 Spedito",
    cls: "bg-green-800 text-white",
    box: "border-green-500 bg-leaf/70",
    msg: "Ordine spedito! Arriverà a breve. Grazie per aver scelto un piccolo produttore 🌱",
  },
  rifiutato: {
    label: "Non accettato · rimborsato",
    cls: "bg-[#f3dada] text-traffic-red",
    box: "border-[#e9caca] bg-[#fdf3f3]",
  },
  // stati legacy (vecchio flusso), tollerati in lettura
  richiesto: {
    label: "Pagamento da completare",
    cls: "bg-[#fff3d4] text-[#7a5a00]",
    box: "border-[#e6dca6] bg-[#fffdf3]",
    msg: "Hai avviato l'ordine ma il pagamento non è stato concluso. Completa il pagamento per inviarlo all'azienda.",
  },
  pagato: {
    label: "Pagato · da spedire",
    cls: "bg-green-700 text-white",
    box: "border-green-300 bg-leaf/40",
    msg: "Siamo in attesa che l'azienda spedisca il tuo ordine.",
  },
};

/** Sezione cliente: i propri ordini shop. Nel nuovo modello il pagamento avviene
 *  già al momento dell'ordine (fondi bloccati), quindi qui non ci sono azioni: il
 *  cliente segue solo lo stato (in attesa di conferma → di spedizione → spedito). */
export function MieiOrdiniShop() {
  const [ordini, setOrdini] = useState<OrdineShop[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // rete di sicurezza: se torno da Stripe (success_url con ?sid=…), verifico la
      // sessione e sblocco l'ordine anche se il webhook non è arrivato.
      try {
        const sid = new URLSearchParams(window.location.search).get("sid");
        if (sid) await verificaOrdineShop(sid);
      } catch {
        /* best-effort */
      }
      listMieiOrdiniShop().then(setOrdini);
    })();
  }, []);

  // ordine "richiesto" = creato ma pagamento non concluso → riavvio il checkout Stripe
  async function completaPagamento(id: string) {
    setBusy(id);
    const { error } = await pagaOrdineShop(id); // se ok reindirizza a Stripe
    if (error) {
      setBusy(null);
      alert("Pagamento non riuscito: " + error);
    }
  }

  if (ordini === null || ordini.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="title-pangea text-2xl text-green-700">Ordini dallo shop</h2>
      <ul className="mt-4 space-y-3">
        {ordini.map((o) => {
          const s = STATO[o.stato] ?? STATO.autorizzato;
          return (
            <li key={o.id} className={`rounded-2xl border p-4 ${s.box}`}>
              {numeroOrdineFmt(o) && (
                <div className="mb-1.5 flex flex-wrap items-baseline gap-2 text-xs">
                  <span className="font-bold text-green-700">Ordine {numeroOrdineFmt(o)}</span>
                  <span className="text-green-900/55">{dataOraOrdine(o.createdAt)}</span>
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-display text-lg text-green-800">
                  {o.aziendaNome || "Azienda"}
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

              {s.msg && (
                <p className="mt-3 text-sm font-semibold text-green-800">{s.msg}</p>
              )}

              {o.stato === "richiesto" && (
                <button
                  className="btn-lime mt-3 text-sm"
                  disabled={busy === o.id}
                  onClick={() => completaPagamento(o.id)}
                >
                  {busy === o.id ? "Avvio…" : "💳 Completa il pagamento"}
                </button>
              )}

              {o.stato === "rifiutato" && (
                <p className="mt-2 rounded-xl bg-white/70 p-2.5 text-xs text-traffic-red">
                  {o.nota ? <>Motivo dell&apos;azienda: «{o.nota}». </> : null}
                  <strong>Rimborso automatico</strong>: non ti è stato addebitato nulla.
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
