"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  listOrdiniRicevutiShop,
  confermaOrdineShop,
  rifiutaOrdineShop,
  segnaOrdineSpedito,
  numeroOrdineFmt,
  dataOraOrdine,
  type OrdineShop,
} from "@/lib/ordini-shop";

// dati del MITTENTE (l'azienda loggata) per l'etichetta di spedizione
type Mittente = {
  nome: string;
  indirizzo: string;
  cap: string;
  citta: string;
  provincia: string;
  piva: string;
};

/** Apre una finestra stampabile (→ "Salva come PDF" dal browser) con l'etichetta:
 *  Mittente (azienda) + Destinatario (cliente) + numero e data ordine + articoli. */
function stampaEtichetta(o: OrdineShop, m: Mittente | null) {
  const w = window.open("", "_blank", "width=760,height=680");
  if (!w) return;
  const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));
  const numero = numeroOrdineFmt(o) || "—";
  const data = dataOraOrdine(o.createdAt);
  const mitt = m
    ? [m.nome, m.indirizzo, [m.cap, m.citta].filter(Boolean).join(" "), m.provincia ? `(${m.provincia})` : "", m.piva ? `P.IVA ${m.piva}` : ""]
        .filter((x) => x && x.trim())
        .map(esc)
        .join("<br/>")
    : esc(o.aziendaNome ?? "Azienda");
  const dest = [
    o.clienteNome ?? "",
    o.indirizzoSpedizione ?? "",
    o.telefono ? `Tel. ${o.telefono}` : "",
    o.codiceFiscale ? `CF ${o.codiceFiscale}` : "",
  ]
    .filter((x) => x && x.trim())
    .map(esc)
    .join("<br/>");
  const items = o.articoli.map((a) => `<li>${a.qta}× ${esc(a.nome)}</li>`).join("");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Etichetta ordine ${esc(numero)}</title>
    <style>
      *{box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;}
      body{margin:0;padding:24px;color:#14310f;}
      .head{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #2f7d1f;padding-bottom:8px;margin-bottom:18px;}
      .num{font-size:22px;font-weight:800;}
      .date{font-size:13px;color:#555;}
      .box{border:1.5px solid #cddcc0;border-radius:12px;padding:14px 16px;margin-bottom:14px;}
      .tit{font-size:11px;font-weight:800;letter-spacing:.06em;color:#2f7d1f;text-transform:uppercase;margin-bottom:6px;}
      .val{font-size:15px;line-height:1.5;}
      .items{margin-top:8px;font-size:14px;} .items ul{margin:6px 0 0 18px;padding:0;}
      @media print{ .noprint{display:none;} body{padding:8px;} }
      .btn{display:inline-block;margin-top:16px;padding:10px 18px;background:#2f7d1f;color:#fff;border:0;border-radius:999px;font-weight:700;cursor:pointer;}
    </style></head><body>
    <div class="head"><div class="num">Ordine ${esc(numero)}</div><div class="date">${esc(data)}</div></div>
    <div class="box"><div class="tit">Mittente</div><div class="val">${mitt}</div></div>
    <div class="box"><div class="tit">Destinatario</div><div class="val">${dest}</div></div>
    <div class="items"><div class="tit" style="color:#14310f">Contenuto</div><ul>${items}</ul></div>
    <button class="btn noprint" onclick="window.print()">🖨️ Stampa / Salva PDF</button>
    <script>window.onload=function(){setTimeout(function(){window.print()},250)}</script>
  </body></html>`);
  w.document.close();
}

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
  const [mittente, setMittente] = useState<Mittente | null>(null);

  const reload = () => listOrdiniRicevutiShop().then(setOrdini);
  useEffect(() => {
    reload();
    // dati dell'azienda loggata (mittente per l'etichetta di spedizione)
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      // ECO-VISA: tabella `aziende`; BioFido: `biofido_businesses` (fallback)
      let { data } = await supabase.from("aziende").select("*").eq("owner", user.id).maybeSingle();
      if (!data) {
        const r = await supabase
          .from("biofido_businesses")
          .select("*")
          .eq("owner", user.id)
          .maybeSingle();
        data = r.data;
      }
      const a = (data ?? {}) as Record<string, string | null>;
      if (data)
        setMittente({
          nome: a.nome ?? a.name ?? "",
          indirizzo: a.indirizzo ?? "",
          cap: a.cap ?? "",
          citta: a.citta_sede ?? a.citta ?? "",
          provincia: a.provincia ?? "",
          piva: a.piva ?? "",
        });
    })();
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
                {numeroOrdineFmt(o) && (
                  <div className="mb-1.5 flex flex-wrap items-baseline gap-2 text-xs">
                    <span className="font-bold text-green-700">Ordine {numeroOrdineFmt(o)}</span>
                    <span className="text-green-900/55">{dataOraOrdine(o.createdAt)}</span>
                  </div>
                )}
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

                {/* ordine accettato: prepara e spedisci */}
                {daSpedire && (
                  <div className="mt-3 rounded-xl bg-leaf/40 p-3">
                    <div className="text-xs font-bold uppercase tracking-wide text-green-700">
                      Prepara l&apos;ordine
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        className="btn-ghost text-sm"
                        onClick={() => stampaEtichetta(o, mittente)}
                      >
                        🖨️ Stampa etichetta (Mittente/Destinatario)
                      </button>
                      <button
                        className="btn-lime text-sm"
                        disabled={busy === o.id}
                        onClick={() => azione(() => segnaOrdineSpedito(o.id), o.id)}
                      >
                        📦 Segna come spedito
                      </button>
                    </div>
                    {/* attivo quando avremo l'accordo con lo spedizioniere (API corriere) */}
                    <button
                      className="mt-2 block cursor-not-allowed text-xs font-semibold text-green-900/35"
                      disabled
                      title="Disponibile quando sarà attivo l'accordo con il corriere"
                    >
                      📦 Contatta il corriere per il ritiro (in arrivo)
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
