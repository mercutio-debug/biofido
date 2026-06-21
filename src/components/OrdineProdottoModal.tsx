"use client";

import { useEffect, useState } from "react";
import {
  creaOrdineEPaga,
  getSellerInfo,
  type Venditore,
} from "@/lib/ordini";
import { CONSENSI_ORDINE, consensiCompleti } from "@/lib/consensi-ordine";

/**
 * Modale d'ordine di un PRODOTTO (gemello ECO-VISA / BioFido).
 * Mostra l'identità del venditore (ragione sociale + P.IVA + sede) e richiede
 * i 3 consensi obbligatori prima di abilitare "Paga". Al pagamento autorizza
 * (manual capture); l'azienda poi accetta/rifiuta.
 */
function parseEuroCents(s?: string | null): number {
  if (!s) return 0;
  const cleaned = String(s).replace(/[^\d.,]/g, "");
  if (!cleaned) return 0;
  const lc = cleaned.lastIndexOf(",");
  const ld = cleaned.lastIndexOf(".");
  let dec = "";
  if (lc > -1 && ld > -1) dec = lc > ld ? "," : ".";
  else if (lc > -1) dec = ",";
  else if (ld > -1) dec = ".";
  let norm = cleaned;
  if (dec) {
    const th = dec === "," ? "." : ",";
    norm = cleaned.split(th).join("").replace(dec, ".");
  }
  const n = parseFloat(norm);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

const euro = (cents: number) =>
  (cents / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" });

export function OrdineProdottoModal({
  prodottoId,
  owner,
  prodottoNome,
  prezzo,
  aziendaNome,
  portale,
  onClose,
}: {
  prodottoId: string;
  owner: string;
  prodottoNome: string;
  prezzo?: string | null;
  aziendaNome?: string;
  portale?: string;
  onClose: () => void;
}) {
  const unitCents = parseEuroCents(prezzo);
  const [venditore, setVenditore] = useState<Venditore>(null);
  const [quantita, setQuantita] = useState(1);
  const [modalita, setModalita] = useState<"spedizione" | "ritiro">("spedizione");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [indirizzo, setIndirizzo] = useState("");
  const [cap, setCap] = useState("");
  const [citta, setCitta] = useState("");
  const [prov, setProv] = useState("");
  const [spunte, setSpunte] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getSellerInfo(prodottoId).then(setVenditore);
  }, [prodottoId]);

  const totaleCents = unitCents * Math.max(1, quantita);
  const datiOk =
    nome.trim() &&
    email.trim() &&
    (modalita === "ritiro" || (indirizzo.trim() && cap.trim() && citta.trim()));
  const puoPagare = consensiCompleti(spunte) && datiOk && !saving;

  async function paga() {
    if (!puoPagare) return;
    setSaving(true);
    setErr(null);
    const { error } = await creaOrdineEPaga({
      prodottoId,
      owner,
      quantita: Math.max(1, quantita),
      clienteNome: nome,
      clienteEmail: email,
      clienteTel: tel,
      modalita,
      indirizzo,
      cap,
      citta,
      prov,
      consensi: spunte,
      portale,
    });
    if (error) {
      setErr(error);
      setSaving(false);
    }
    // in caso di successo c'è il redirect a Stripe
  }

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="card max-h-[92vh] w-full max-w-lg overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-lime-500">
              Ordina il prodotto
            </div>
            <h3 className="font-display text-2xl text-green-800">{prodottoNome}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-2xl leading-none text-green-900/50 hover:text-green-900"
            aria-label="Chiudi"
          >
            ×
          </button>
        </div>

        {/* Identità del venditore */}
        <div className="mt-4 rounded-xl border border-[#e3eed7] bg-leaf/60 p-3 text-sm">
          <div className="font-semibold text-green-800">
            Vendita e spedizione a cura di:
          </div>
          {venditore ? (
            <div className="mt-1 text-green-900/85">
              <strong>{venditore.ragioneSociale}</strong>
              {" · "}P.IVA {venditore.partitaIva}
              {venditore.citta && (
                <>
                  {" · "}
                  {venditore.citta}
                  {venditore.provincia ? ` (${venditore.provincia})` : ""}
                </>
              )}
            </div>
          ) : (
            <div className="mt-1 text-green-900/70">
              {aziendaNome ?? "Azienda venditrice"}. La piattaforma è solo intermediaria,
              non il venditore.
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Quantità *</span>
            <input
              type="number"
              min={1}
              max={99}
              className="field mt-1"
              value={quantita}
              onChange={(e) => setQuantita(Math.max(1, Number(e.target.value)))}
            />
          </label>
          <label className="block">
            <span className="label">Consegna *</span>
            <select
              className="field mt-1"
              value={modalita}
              onChange={(e) => setModalita(e.target.value as "spedizione" | "ritiro")}
            >
              <option value="spedizione">Spedizione</option>
              <option value="ritiro">Ritiro in azienda</option>
            </select>
          </label>
          <label className="block">
            <span className="label">Nome e cognome *</span>
            <input className="field mt-1" value={nome} onChange={(e) => setNome(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Email *</span>
            <input type="email" className="field mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Telefono</span>
            <input className="field mt-1" value={tel} onChange={(e) => setTel(e.target.value)} />
          </label>

          {modalita === "spedizione" && (
            <>
              <label className="block sm:col-span-2">
                <span className="label">Indirizzo di spedizione *</span>
                <input className="field mt-1" value={indirizzo} onChange={(e) => setIndirizzo(e.target.value)} />
              </label>
              <label className="block">
                <span className="label">CAP *</span>
                <input className="field mt-1" value={cap} onChange={(e) => setCap(e.target.value)} />
              </label>
              <label className="block">
                <span className="label">Città *</span>
                <input className="field mt-1" value={citta} onChange={(e) => setCitta(e.target.value)} />
              </label>
              <label className="block">
                <span className="label">Provincia</span>
                <input className="field mt-1" value={prov} onChange={(e) => setProv(e.target.value)} />
              </label>
            </>
          )}
        </div>

        {unitCents > 0 && (
          <div className="mt-4 flex items-center justify-between rounded-xl bg-leaf px-4 py-3">
            <span className="text-sm font-semibold text-green-800">Totale</span>
            <span className="font-display text-2xl text-green-700">{euro(totaleCents)}</span>
          </div>
        )}

        {/* 3 consensi obbligatori */}
        <div className="mt-4 space-y-2">
          {CONSENSI_ORDINE.map((c) => {
            const [pre, post] = c.link ? c.testo.split("{LINK}") : [c.testo, ""];
            return (
              <label key={c.id} className="flex items-start gap-2 text-sm text-green-900/85">
                <input
                  type="checkbox"
                  className="mt-0.5 h-5 w-5 accent-[var(--lime-500)]"
                  checked={!!spunte[c.id]}
                  onChange={(e) => setSpunte((s) => ({ ...s, [c.id]: e.target.checked }))}
                />
                <span>
                  {pre}
                  {c.link && (
                    <a
                      href={c.link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-green-700 underline"
                    >
                      {c.link.label}
                    </a>
                  )}
                  {post}
                </span>
              </label>
            );
          })}
        </div>

        {err && <p className="mt-3 text-sm font-semibold text-traffic-red">{err}</p>}

        <button
          className="btn-lime mt-4 w-full justify-center"
          onClick={paga}
          disabled={!puoPagare}
        >
          {saving ? "Avvio pagamento…" : "Paga"}
        </button>
        <p className="mt-2 text-center text-[11px] text-green-900/55">
          Al pagamento i fondi sono solo <strong>autorizzati</strong>: l&apos;addebito
          avviene quando l&apos;azienda accetta l&apos;ordine.
        </p>
      </div>
    </div>
  );
}
