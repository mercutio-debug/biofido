"use client";

import { useEffect, useRef, useState } from "react";
import {
  loadCatalogo,
  salvaVoce,
  eliminaVoce,
  caricaImmagineCatalogo,
  TIPI_VOCE,
  type VoceCatalogo,
  type TipoVoce,
} from "@/lib/catalogo";

/**
 * Catalogo vendite — funzione GOLD. L'azienda carica prodotti e servizi (con
 * numero, nome, tipo, prezzo, immagine). I clienti li vedranno in anteprima sul
 * widget e potranno contattare l'azienda (Fase 2).
 */
export function CatalogoCard({ ownerId, gold }: { ownerId: string; gold: boolean }) {
  const [voci, setVoci] = useState<VoceCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<VoceCatalogo | null>(null);

  function ricarica() {
    loadCatalogo(ownerId).then((v) => {
      setVoci(v);
      setLoading(false);
    });
  }
  useEffect(ricarica, [ownerId]);

  if (!gold) {
    return (
      <section className="card mt-6 p-6">
        <h2 className="font-display text-2xl text-green-800">
          Catalogo prodotti e servizi
        </h2>
        <p className="mt-1 text-sm text-green-900/70">
          Carica prodotti e servizi (visite guidate, laboratori didattici,
          esperienze) con prezzo e foto: i clienti li vedono in anteprima e
          possono contattarti per info o prenotazioni. È una funzione del piano{" "}
          <strong>Gold</strong>.
        </p>
      </section>
    );
  }

  function nuova() {
    const numero = voci.reduce((m, v) => Math.max(m, v.numero), 0) + 1;
    setEditing({
      numero,
      nome: "",
      tipo: "prodotto",
      prezzo: null,
      unita: null,
      descrizione: null,
      immagine: null,
    });
  }

  return (
    <section className="card mt-6 p-6">
      <h2 className="font-display text-2xl text-green-800">
        Catalogo prodotti e servizi{" "}
        <span className="text-sm font-normal text-green-900/60">(Gold)</span>
      </h2>
      <p className="mt-1 text-sm text-green-900/70">
        Prodotti e servizi che vendi. I clienti li vedono in anteprima sul widget
        e ti contattano per info o prenotazione.
      </p>

      {!loading && voci.length > 0 && (
        <ul className="mt-4 space-y-2">
          {voci.map((v) => {
            const t = TIPI_VOCE.find((x) => x.id === v.tipo);
            return (
              <li
                key={v.id}
                className="flex items-center gap-3 rounded-xl border border-[#e3eed7] bg-white px-3 py-2"
              >
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-leaf text-xs font-bold text-green-800">
                  {v.numero}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {v.immagine ? (
                  <img src={v.immagine} alt="" className="h-12 w-12 flex-none rounded-lg object-cover" />
                ) : (
                  <span className="h-12 w-12 flex-none rounded-lg bg-leaf" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-green-800">{v.nome}</div>
                  <div className="truncate text-xs text-green-900/60">
                    {t?.label}
                    {v.prezzo != null ? ` · ${v.prezzo} €${v.unita ? "/" + v.unita : ""}` : ""}
                  </div>
                </div>
                <button className="text-xs font-bold text-green-700 hover:underline" onClick={() => setEditing(v)}>
                  Modifica
                </button>
                <button
                  className="text-xs font-bold text-traffic-red hover:underline"
                  onClick={async () => {
                    if (v.id) await eliminaVoce(v.id);
                    ricarica();
                  }}
                >
                  Elimina
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button className="btn-lime mt-4 text-sm" onClick={nuova}>
        + Aggiungi prodotto o servizio
      </button>

      {editing && (
        <VoceEditor
          ownerId={ownerId}
          voce={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            ricarica();
          }}
        />
      )}
    </section>
  );
}

function VoceEditor({
  ownerId,
  voce,
  onClose,
  onSaved,
}: {
  ownerId: string;
  voce: VoceCatalogo;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [v, setV] = useState<VoceCatalogo>(voce);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof VoceCatalogo>(k: K, val: VoceCatalogo[K]) {
    setV((p) => ({ ...p, [k]: val }));
  }

  async function scegliFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg(null);
    try {
      const url = await caricaImmagineCatalogo(ownerId, file);
      set("immagine", url);
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function salva() {
    if (!v.nome.trim()) {
      setMsg("Inserisci il nome.");
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      await salvaVoce(ownerId, v);
      onSaved();
    } catch (err) {
      setMsg((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/55 p-4" onClick={onClose}>
      <div className="card max-h-[92vh] w-full max-w-lg overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl text-green-800">
            {v.id ? "Modifica voce" : `Voce n. ${v.numero}`}
          </h3>
          <button onClick={onClose} aria-label="Chiudi" className="text-2xl leading-none text-green-900/40 hover:text-green-900">
            ×
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="label">Nome del prodotto o servizio</span>
            <input className="field mt-1" value={v.nome} onChange={(e) => set("nome", e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Tipo</span>
            <select className="field mt-1" value={v.tipo} onChange={(e) => set("tipo", e.target.value as TipoVoce)}>
              {TIPI_VOCE.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Prezzo (€)</span>
            <input
              type="number"
              className="field mt-1"
              value={v.prezzo ?? ""}
              onChange={(e) => set("prezzo", e.target.value === "" ? null : Number(e.target.value))}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Descrizione (facoltativa)</span>
            <textarea className="field mt-1 h-20" value={v.descrizione ?? ""} onChange={(e) => set("descrizione", e.target.value)} />
          </label>
        </div>

        {/* immagine con ridimensionamento automatico */}
        <div className="mt-3">
          <span className="label">Immagine</span>
          <div className="mt-1 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {v.immagine ? (
              <img src={v.immagine} alt="" className="h-20 w-20 rounded-lg object-cover" />
            ) : (
              <span className="flex h-20 w-20 items-center justify-center rounded-lg bg-leaf text-xs text-green-900/50">
                nessuna
              </span>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={scegliFoto} />
            <button type="button" className="btn-ghost text-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? "Carico…" : v.immagine ? "Cambia foto" : "Carica foto"}
            </button>
          </div>
          <p className="mt-1 text-[11px] text-green-900/50">
            La foto viene ridimensionata e alleggerita in automatico.
          </p>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button className="btn-lime" onClick={salva} disabled={saving || uploading || !v.nome.trim()}>
            {saving ? "Salvo…" : "Salva"}
          </button>
          <button className="btn-ghost text-sm" onClick={onClose}>
            Annulla
          </button>
        </div>
        {msg && <p className="mt-2 text-sm font-semibold text-traffic-red">{msg}</p>}
      </div>
    </div>
  );
}
