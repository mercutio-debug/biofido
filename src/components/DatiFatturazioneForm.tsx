"use client";

import { useEffect, useState } from "react";
import {
  DATI_VUOTI,
  type DatiFatturazione,
  caricaDatiFatturazione,
  salvaDatiFatturazione,
  lookupPiva,
  datiCompleti,
  recapitoValido,
} from "@/lib/fatturazione";
import { ComuneAutocomplete } from "@/components/ComuneAutocomplete";
import { loadComuni, type Comune } from "@/lib/comuni";
import { lookupCap } from "@/lib/geo";

/** Dati anagrafici da cui precompilare la fatturazione (completata col resto). */
export type PrefillFatturazione = {
  ragione_sociale?: string;
  partita_iva?: string;
  codice_fiscale?: string;
  indirizzo?: string;
  cap?: string;
  citta?: string;
  provincia?: string;
};

/**
 * Controllo LOCALE del formato P.IVA italiana (11 cifre + cifra di controllo).
 * Serve a distinguere una P.IVA scritta male da una valida ma non presente nel
 * registro VIES (caso comune per piccole imprese e aziende agricole).
 */
function pivaFormaleOk(input: string): boolean {
  const s = (input || "").replace(/\D/g, "");
  if (s.length !== 11) return false;
  let x = 0;
  let y = 0;
  for (let i = 0; i < 10; i++) {
    const n = s.charCodeAt(i) - 48;
    if (i % 2 === 0) x += n;
    else {
      const dpl = n * 2;
      y += dpl > 9 ? dpl - 9 : dpl;
    }
  }
  const ctrl = (10 - ((x + y) % 10)) % 10;
  return ctrl === s.charCodeAt(10) - 48;
}

/**
 * Form dei dati di fatturazione, mostrato prima del pagamento per i piani
 * Silver/Gold (il Free non fattura). Autocompila da Partita IVA via VIES e
 * gestisce il recapito della fattura elettronica: codice SDI, oppure PEC,
 * oppure 0000000 (cassetto fiscale).
 */
export function DatiFatturazioneForm({
  ownerId,
  onValid,
  prefill,
}: {
  ownerId: string;
  onValid?: (valido: boolean) => void;
  prefill?: PrefillFatturazione;
}) {
  const [d, setD] = useState<DatiFatturazione>(DATI_VUOTI);
  const [loading, setLoading] = useState(true);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [salvato, setSalvato] = useState(false);
  const [cfUguale, setCfUguale] = useState(false);
  const [vies, setVies] = useState<"valida" | "formale" | "invalida" | null>(null);

  useEffect(() => {
    caricaDatiFatturazione().then(async (dati) => {
      if (dati) {
        setD({ ...DATI_VUOTI, ...dati });
        setCfUguale(!!dati.codice_fiscale && dati.codice_fiscale === dati.partita_iva);
        setSalvato(true);
      } else if (prefill) {
        // Nessun dato salvato: precompilo dalla scheda anagrafica (da completare).
        const base: DatiFatturazione = {
          ...DATI_VUOTI,
          ragione_sociale: prefill.ragione_sociale ?? "",
          partita_iva: prefill.partita_iva ?? "",
          codice_fiscale: prefill.codice_fiscale ?? "",
          indirizzo: prefill.indirizzo ?? "",
          cap: prefill.cap ?? "",
          citta: prefill.citta ?? "",
          provincia: prefill.provincia ?? "",
        };
        setCfUguale(
          !!base.codice_fiscale && base.codice_fiscale === base.partita_iva,
        );
        setD(base);
        // Se conosco la città ma manca provincia o CAP, li ricavo dai comuni.
        if (prefill.citta && (!base.provincia || !base.cap)) {
          try {
            const comuni = await loadComuni();
            const norm = (s: string) => s.trim().toLowerCase();
            const c = comuni.find((x) => norm(x.nome) === norm(prefill.citta!));
            if (c) {
              if (!base.provincia) setD((prev) => ({ ...prev, provincia: c.prov }));
              if (!base.cap) {
                const cap = await lookupCap(c.nome, c.prov);
                if (cap) setD((prev) => ({ ...prev, cap }));
              }
            }
          } catch {
            /* comuni non caricati: l'utente sceglie la città dall'autocomplete */
          }
        }
      }
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quando "CF uguale alla P.IVA" è spuntato, copia (e mantiene aggiornato) il
  // codice fiscale con il numero di partita IVA.
  useEffect(() => {
    if (!cfUguale) return;
    setD((prev) =>
      prev.codice_fiscale === prev.partita_iva
        ? prev
        : { ...prev, codice_fiscale: prev.partita_iva },
    );
  }, [cfUguale, d.partita_iva]);

  useEffect(() => {
    onValid?.(salvato && datiCompleti(d));
  }, [salvato, d, onValid]);

  function set<K extends keyof DatiFatturazione>(k: K, v: DatiFatturazione[K]) {
    setD((prev) => ({ ...prev, [k]: v }));
    setSalvato(false);
  }

  // Scelta della città dall'autocomplete: compila in cascata città + provincia
  // e ricava il CAP (modificabile). Stesso automatismo della scheda anagrafica.
  async function applicaComune(c: Comune) {
    setD((prev) => ({ ...prev, citta: c.nome, provincia: c.prov }));
    setSalvato(false);
    const cap = await lookupCap(c.nome, c.prov);
    if (cap) setD((prev) => ({ ...prev, cap }));
  }

  async function recupera() {
    setMsg(null);
    setLookupBusy(true);
    try {
      const dati = await lookupPiva(d.partita_iva);
      if (!dati) {
        const formale = pivaFormaleOk(d.partita_iva);
        setVies(formale ? "formale" : "invalida");
        setMsg(
          formale
            ? "Partita IVA non presente nel registro VIES — è normale per molte piccole imprese e aziende agricole. Il formato è corretto: compila i dati qui sotto a mano e prosegui pure, sei iscritto regolarmente."
            : "La Partita IVA non sembra corretta: controlla che siano 11 cifre.",
        );
      } else {
        setD((prev) => ({ ...prev, ...dati }));
        setVies("valida");
        setMsg("Dati recuperati dal registro VIES. Controlla e completa il recapito SDI/PEC.");
      }
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setLookupBusy(false);
    }
  }

  async function salva() {
    setSaving(true);
    setMsg(null);
    try {
      await salvaDatiFatturazione(ownerId, {
        ...d,
        codice_fiscale: cfUguale ? d.partita_iva : d.codice_fiscale,
      });
      setSalvato(true);
      setMsg("Dati di fatturazione salvati ✅");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#e3eed7] bg-white p-5 text-sm text-green-900/60">
        Carico i dati di fatturazione…
      </div>
    );
  }

  const sdiUpper = (d.codice_sdi || "").toUpperCase();
  const usaPec = !sdiUpper || sdiUpper === "0000000";
  const recapitoOk = recapitoValido(d);

  return (
    <div className="rounded-2xl border border-[#e3eed7] bg-white p-5 text-left">
      <h3 className="font-display text-xl text-green-800">Dati di fatturazione</h3>
      <p className="mt-1 text-sm text-green-900/65">
        Servono per emetterti la fattura elettronica del piano. I prezzi sono{" "}
        <strong>+ IVA 22%</strong>.
      </p>

      {/* Partita IVA + autocompletamento */}
      <div className="mt-4">
        <span className="label">Partita IVA</span>
        <div className="mt-1 flex gap-2">
          <input
            className="field flex-1"
            value={d.partita_iva}
            inputMode="numeric"
            placeholder="11 cifre"
            onChange={(e) => {
              set("partita_iva", e.target.value);
              setVies(null);
            }}
          />
          <button
            type="button"
            className="btn-ghost whitespace-nowrap"
            onClick={recupera}
            disabled={lookupBusy || d.partita_iva.replace(/\D/g, "").length !== 11}
          >
            {lookupBusy ? "Cerco…" : "Recupera dati"}
          </button>
        </div>
        {vies === "valida" && (
          <p className="mt-1 text-xs font-semibold text-green-700">✓ Partita IVA verificata sul registro VIES</p>
        )}
        {vies === "formale" && (
          <p className="mt-1 text-xs font-semibold text-[#b8860b]">
            ✓ Formato corretto (non presente in VIES — normale per piccole imprese e aziende agricole)
          </p>
        )}
        {vies === "invalida" && (
          <p className="mt-1 text-xs font-semibold text-traffic-red">✕ Partita IVA non valida: controlla le 11 cifre</p>
        )}
      </div>

      <div className="mt-3">
        <span className="label">Ragione sociale</span>
        <input
          className="field mt-1"
          value={d.ragione_sociale}
          onChange={(e) => set("ragione_sociale", e.target.value)}
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <span className="label">Indirizzo (sede)</span>
          <input className="field mt-1" value={d.indirizzo ?? ""} onChange={(e) => set("indirizzo", e.target.value)} />
        </div>
        <div>
          <span className="label">Codice fiscale</span>
          <input
            className="field mt-1 disabled:opacity-60"
            value={d.codice_fiscale ?? ""}
            disabled={cfUguale}
            onChange={(e) => set("codice_fiscale", e.target.value)}
          />
          <label className="mt-1.5 flex items-center gap-2 text-xs font-semibold text-green-900/75">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--lime-500)]"
              checked={cfUguale}
              onChange={(e) => {
                setCfUguale(e.target.checked);
                setSalvato(false);
              }}
            />
            Codice fiscale uguale alla Partita IVA
          </label>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
          <span className="label">CAP</span>
          <input className="field mt-1" value={d.cap ?? ""} inputMode="numeric" onChange={(e) => set("cap", e.target.value)} />
        </div>
        <div className="sm:col-span-1">
          <span className="label">Città</span>
          <div className="mt-1">
            <ComuneAutocomplete
              value={d.citta ?? ""}
              onSelect={applicaComune}
              placeholder="Inizia a scrivere la città…"
            />
          </div>
        </div>
        <div>
          <span className="label">Prov.</span>
          <input className="field mt-1" maxLength={2} value={d.provincia ?? ""} onChange={(e) => set("provincia", e.target.value.toUpperCase())} />
        </div>
      </div>

      {/* Recapito fattura elettronica */}
      <div className="mt-4 rounded-xl bg-leaf/50 p-4">
        <span className="label">Recapito fattura elettronica</span>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-green-900/70">Codice destinatario SDI (7 caratteri)</label>
            <input
              className="field mt-1 uppercase"
              maxLength={7}
              value={d.codice_sdi}
              placeholder="es. ABCDEF1 o 0000000"
              onChange={(e) => set("codice_sdi", e.target.value.toUpperCase())}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-green-900/70">
              …oppure PEC {usaPec ? "" : "(disattivata: hai un codice SDI)"}
            </label>
            <input
              className="field mt-1"
              type="email"
              value={d.pec ?? ""}
              disabled={!usaPec}
              placeholder="azienda@pec.it"
              onChange={(e) => set("pec", e.target.value)}
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-green-900/60">
          Hai un codice SDI? Inseriscilo. Altrimenti la tua <strong>PEC</strong>. Se non
          hai né l&apos;uno né l&apos;altra, lascia <code>0000000</code>: la fattura ti arriverà
          nel Cassetto Fiscale.
        </p>
        {!recapitoOk && (
          <p className="mt-1 text-xs font-semibold text-traffic-red">
            Il codice SDI deve avere 7 caratteri, oppure inserisci una PEC valida.
          </p>
        )}
      </div>

      <div className="mt-3">
        <span className="label">Email amministrativa (copia di cortesia)</span>
        <input className="field mt-1" type="email" value={d.email ?? ""} onChange={(e) => set("email", e.target.value)} />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          className="btn-lime"
          onClick={salva}
          disabled={saving || !datiCompleti(d)}
        >
          {saving ? "Salvo…" : salvato ? "Dati salvati ✅" : "Salva dati di fatturazione"}
        </button>
        {!datiCompleti(d) && (
          <span className="text-xs text-green-900/55">Compila ragione sociale, P.IVA e recapito.</span>
        )}
      </div>
      {msg && <p className="mt-2 text-sm font-semibold text-green-700">{msg}</p>}
    </div>
  );
}
