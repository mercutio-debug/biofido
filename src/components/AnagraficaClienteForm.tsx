"use client";

import { useEffect, useState } from "react";
import {
  loadAnagraficaCliente,
  saveAnagraficaCliente,
  anagraficaClienteCompleta,
  type AnagraficaCliente,
} from "@/lib/clienti";
import { IndirizzoAutocomplete } from "@/components/IndirizzoAutocomplete";

/**
 * Form dell'anagrafica CLIENTE (nome, codice fiscale, indirizzo…). Obbligatoria
 * per ordinare/prenotare: l'azienda deve poter emettere fattura e contattare. */
export function AnagraficaClienteForm({ onSaved }: { onSaved?: () => void }) {
  const [a, setA] = useState<AnagraficaCliente | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    loadAnagraficaCliente().then(setA);
  }, []);

  if (!a) return <p className="text-sm text-green-900/60">Caricamento…</p>;

  const set = (patch: Partial<AnagraficaCliente>) => setA((prev) => ({ ...(prev as AnagraficaCliente), ...patch }));
  const completa = anagraficaClienteCompleta(a);

  async function salva() {
    setSaving(true);
    setMsg(null);
    const { error } = await saveAnagraficaCliente(a as AnagraficaCliente);
    setSaving(false);
    if (error) {
      setMsg("Errore: " + error);
      return;
    }
    setMsg("Dati salvati ✓");
    onSaved?.();
  }

  return (
    <div>
      {!completa && (
        <p className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          ⚠️ Completa i tuoi dati (servono nome, <strong>codice fiscale</strong>, indirizzo, CAP e
          città) per poter ordinare prodotti e prenotare esperienze: l&apos;azienda li usa per la
          fattura e la spedizione.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="label">Nome e cognome *</span>
          <input className="field mt-1" value={a.nome} onChange={(e) => set({ nome: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">Codice fiscale *</span>
          <input
            className="field mt-1 uppercase"
            value={a.codiceFiscale}
            maxLength={16}
            onChange={(e) => set({ codiceFiscale: e.target.value.toUpperCase() })}
            placeholder="RSSMRA80A01H501U"
          />
        </label>
        <label className="block">
          <span className="label">Telefono</span>
          <input className="field mt-1" value={a.telefono} onChange={(e) => set({ telefono: e.target.value })} />
        </label>
        <label className="block sm:col-span-2">
          <span className="label">Indirizzo (via e numero) *</span>
          <div className="mt-1">
            <IndirizzoAutocomplete
              value={a.indirizzo}
              onChange={(v) => set({ indirizzo: v })}
              onSelect={(s) =>
                set({
                  indirizzo: s.via ?? s.label,
                  ...(s.cap ? { cap: s.cap } : {}),
                  ...(s.citta ? { citta: s.citta } : {}),
                  ...(s.provincia ? { provincia: s.provincia } : {}),
                })
              }
              placeholder="Inizia a digitare: es. Via Roma 1, Genova"
            />
          </div>
        </label>
        <label className="block">
          <span className="label">CAP *</span>
          <input className="field mt-1" value={a.cap} inputMode="numeric" maxLength={5} onChange={(e) => set({ cap: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">Città *</span>
          <input className="field mt-1" value={a.citta} onChange={(e) => set({ citta: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">Provincia</span>
          <input className="field mt-1 uppercase" value={a.provincia} maxLength={2} onChange={(e) => set({ provincia: e.target.value.toUpperCase() })} placeholder="GE" />
        </label>
        <label className="block">
          <span className="label">
            Codice destinatario SDI <span className="font-normal text-green-900/40">(facoltativo)</span>
          </span>
          <input
            className="field mt-1 uppercase"
            value={a.codiceSdi}
            maxLength={7}
            onChange={(e) => set({ codiceSdi: e.target.value.toUpperCase() })}
            placeholder="es. ABCDEFG"
          />
        </label>
        <label className="block">
          <span className="label">
            PEC <span className="font-normal text-green-900/40">(facoltativo)</span>
          </span>
          <input
            className="field mt-1"
            type="email"
            value={a.pec}
            onChange={(e) => set({ pec: e.target.value })}
            placeholder="nome@pec.it"
          />
        </label>
        <p className="sm:col-span-2 text-xs text-green-900/55">
          💡 <strong>SDI o PEC</strong> servono per ricevere la <strong>fattura elettronica</strong>.
          Se non li hai (privato), lascia vuoto: l&apos;azienda userà <strong>0000000</strong> e la
          fattura arriverà nel tuo Cassetto Fiscale tramite il codice fiscale.
        </p>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button className="btn-lime" onClick={salva} disabled={saving || !a.nome.trim()}>
          {saving ? "Salvataggio…" : "Salva i miei dati"}
        </button>
        {msg && <span className="text-sm font-semibold text-green-700">{msg}</span>}
      </div>
    </div>
  );
}
