"use client";

import { useEffect, useState } from "react";
import {
  listOrdiniRicevutiShop,
  confermaOrdineShop,
  rifiutaOrdineShop,
  segnaOrdineSpedito,
  type OrdineShop,
} from "@/lib/ordini-shop";

const STATO: Record<string, { label: string; cls: string }> = {
  autorizzato: { label: "💳 Pagato · da accettare", cls: "bg-badge-yellow text-green-900" },
  confermato: { label: "✓ Accettato · da spedire", cls: "bg-green-700 text-white" },
  rifiutato: { label: "Non accettato", cls: "bg-[#f3dada] text-traffic-red" },
  spedito: { label: "Spedito ✓", cls: "bg-green-800 text-white" },
  // stati legacy (vecchio flusso): li mostro senza rompere nulla
  richiesto: { label: "In attesa di pagamento", cls: "bg-[#fff3d4] text-[#7a5a00]" },
  pagato: { label: "Pagato · da spedire", cls: "bg-green-700 text-white" },
  accettato: { label: "Accettato", cls: "bg-leaf text-green-800" },
  controproposta: { label: "In lavorazione", cls: "bg-[#fff3d4] text-[#7a5a00]" },
  annullato: { label: "Annullato", cls: "bg-[#eee] text-green-900/60" },
};

/** Card dashboard: ordini ricevuti dallo shop. Il cliente ha GIÀ pagato (fondi
 *  bloccati): l'azienda accetta (incassa) o non accetta indicando il motivo → al
 *  cliente viene rimborsato tutto in automatico. */
export function OrdiniShopRicevuti() {
  const [ordini, setOrdini] = useState<OrdineShop[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rifiuto, setRifiuto] = useState<string | null>(null); // id ordine in fase di rifiuto
  const [motivo, setMotivo] = useState("");

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
      setRifiuto(null);
      setMotivo("");
      reload();
    }
  }

  if (ordini === null) return null;

  return (
    <section className="card mt-6 p-6">
      <h2 className="font-display text-2xl text-green-800">🛒 Ordini ricevuti (shop)</h2>
      <p className="mt-1 text-sm text-green-900/70">
        Il cliente ha <strong>già pagato</strong> (fondi bloccati): <strong>accetta</strong> per
        incassare e spedire, oppure <strong>non accettare</strong> indicando il motivo — al cliente
        viene rimborsato tutto in automatico.
      </p>

      {ordini.length === 0 ? (
        <p className="mt-4 rounded-xl bg-leaf/40 p-4 text-sm text-green-900/70">
          Nessun ordine per ora.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {ordini.map((o) => {
            const s = STATO[o.stato] ?? STATO.autorizzato;
            const daAccettare = o.stato === "autorizzato";
            const daSpedire =
              o.stato === "confermato" || o.stato === "pagato" || o.stato === "accettato";
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

                {/* ordine rifiutato: mostro il motivo comunicato al cliente */}
                {o.stato === "rifiutato" && o.nota && (
                  <div className="mt-2 rounded-xl bg-[#fdf0f0] p-2 text-xs text-traffic-red">
                    Motivo comunicato al cliente: «{o.nota}»
                  </div>
                )}

                {/* AZIONI — ordine pagato in attesa di accettazione */}
                {daAccettare && rifiuto !== o.id && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className="btn-lime text-sm"
                      disabled={busy === o.id}
                      onClick={() => azione(() => confermaOrdineShop(o.id), o.id)}
                    >
                      ✓ Accetta e incassa
                    </button>
                    <button
                      className="text-sm font-bold text-traffic-red hover:underline"
                      onClick={() => {
                        setRifiuto(o.id);
                        setMotivo("");
                      }}
                    >
                      Non accetto
                    </button>
                  </div>
                )}

                {/* form rifiuto con motivazione (→ storno automatico + messaggio al cliente) */}
                {rifiuto === o.id && (
                  <div className="mt-3 rounded-xl bg-[#fdf0f0] p-3">
                    <div className="text-xs font-bold uppercase tracking-wide text-traffic-red">
                      Perché non accetti l&apos;ordine?
                    </div>
                    <p className="mt-1 text-xs text-green-900/70">
                      Il cliente riceverà questo messaggio e il <strong>rimborso automatico</strong>{" "}
                      (nessun addebito).
                    </p>
                    <textarea
                      className="field mt-2 w-full"
                      rows={3}
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Es. prodotto terminato, problemi di reperimento della materia prima…"
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        className="rounded-full bg-traffic-red px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                        disabled={busy === o.id || !motivo.trim()}
                        onClick={() => azione(() => rifiutaOrdineShop(o.id, motivo.trim()), o.id)}
                      >
                        Conferma rifiuto + rimborso
                      </button>
                      <button
                        className="btn-ghost text-sm"
                        onClick={() => {
                          setRifiuto(null);
                          setMotivo("");
                        }}
                      >
                        Annulla
                      </button>
                    </div>
                  </div>
                )}

                {/* ordine accettato: da spedire */}
                {daSpedire && (
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
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
