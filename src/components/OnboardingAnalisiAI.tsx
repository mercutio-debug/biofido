"use client";

import { useEffect, useState } from "react";
import {
  estraiOnboarding,
  loadBozza,
  salvaBozza,
  type ProdottoEstratto,
} from "@/lib/onboarding-ai";

type FileMin = { url: string; tipo?: string | null; nome?: string };

function isImg(f: FileMin): boolean {
  if (f.tipo && /^image\//i.test(f.tipo)) return true;
  return /\.(png|jpe?g|webp|gif|bmp)$/i.test(f.url || "");
}

/**
 * Analisi AI del materiale di onboarding + REVISIONE editabile della bozza.
 * Trasparente per principio: non inventa descrizioni (le completa l'azienda qui),
 * foto open source segnalate, ricevuta, e nessuna pubblicazione automatica.
 * La bozza è salvata a parte: diventa scheda pubblica SOLO all'approvazione finale.
 */
export function OnboardingAnalisiAI({ files, portale }: { files: FileMin[]; portale: string }) {
  const [testo, setTesto] = useState("");
  const [loading, setLoading] = useState(false);
  const [prodotti, setProdotti] = useState<ProdottoEstratto[] | null>(null);
  const [ricevuta, setRicevuta] = useState<string[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const immagini = files.filter(isImg).map((f) => f.url);
  const isBio = portale === "BioFido";

  // carico la bozza già salvata (se l'azienda torna a completarla)
  useEffect(() => {
    let vivo = true;
    loadBozza().then((b) => {
      if (vivo && b && b.prodotti.length) {
        setProdotti(b.prodotti);
        if (b.testo) setTesto(b.testo);
      }
    });
    return () => {
      vivo = false;
    };
  }, []);

  async function analizza() {
    setLoading(true);
    setMsg(null);
    setRicevuta(null);
    const r = await estraiOnboarding(testo.trim(), immagini);
    setLoading(false);
    if (r.error) {
      setMsg(r.error);
      return;
    }
    setProdotti(r.prodotti ?? []);
    setRicevuta(r.ricevuta ?? []);
  }

  function aggiorna(i: number, patch: Partial<ProdottoEstratto>) {
    setProdotti((prev) =>
      prev ? prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) : prev,
    );
  }
  function rimuovi(i: number) {
    setProdotti((prev) => (prev ? prev.filter((_, idx) => idx !== i) : prev));
  }
  async function salvaModifiche() {
    if (!prodotti) return;
    setSalvando(true);
    setMsg(null);
    const { error } = await salvaBozza(prodotti);
    setSalvando(false);
    setMsg(error ? "Errore nel salvataggio: " + error : "Modifiche salvate ✓");
  }

  return (
    <div className="mt-5 rounded-2xl border-2 border-green-300 bg-white p-5">
      <h3 className="font-display text-xl text-green-800">🤖 Analisi automatica del tuo materiale</h3>

      {/* DISCLAIMER (sempre visibile): niente magie, niente invenzioni */}
      <div className="mt-2 rounded-xl bg-leaf/50 p-3 text-xs leading-relaxed text-green-900/80">
        <strong>Come lavoriamo, in chiaro:</strong>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>
            Analizziamo <strong>solo ciò che carichi</strong> (foto + le tue note). Non aggiungiamo nulla di inventato.
          </li>
          <li>
            <strong>Non scriviamo descrizioni</strong> di prodotti che non conosciamo: se non fornisci la descrizione,
            usiamo <strong>solo il nome</strong>. La descrizione la aggiungi/completi <strong>tu qui sotto</strong> —
            sei tu a conoscere e garantire i tuoi prodotti.
          </li>
          <li>
            Se manca la <strong>foto</strong>, ne cerchiamo una <strong>open source</strong> (licenze libere) attinente al
            tipo di prodotto, e te lo segnaliamo (così sai che non è una tua foto).
          </li>
          <li>
            {isBio
              ? "L'origine delle materie prime (il semaforo della filiera) è facoltativa: la riportiamo solo se la dichiari."
              : "L'origine delle materie prime (per il semaforo della filiera) la riportiamo solo se la dichiari — non la inventiamo."}
          </li>
          <li>
            La scheda <strong>non viene mai pubblicata automaticamente</strong>: dopo la nostra verifica, sei <strong>tu</strong>
            a pubblicarla, con la tua approvazione finale e l&apos;accettazione della responsabilità sui dati.
          </li>
        </ul>
      </div>

      <label className="mt-3 block">
        <span className="label">Due righe sui tuoi prodotti (facoltativo, ma aiuta)</span>
        <textarea
          className="field mt-1"
          rows={3}
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          placeholder="Es. «Produco olio essenziale di lavanda e marmellata di mele. La lavanda è di Nava.»"
        />
      </label>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={analizza}
          disabled={loading || (immagini.length === 0 && !testo.trim())}
          className="btn-lime text-sm disabled:opacity-50"
        >
          {loading ? "Analizzo il materiale…" : prodotti && prodotti.length ? "🔁 Ri-analizza" : "🔎 Analizza foto e testo"}
        </button>
        <span className="text-xs text-green-900/55">
          {immagini.length > 0 ? `${immagini.length} foto pronte da analizzare` : "Nessuna foto: caricane sopra o scrivi le note"}
        </span>
      </div>
      {msg && <p className="mt-2 text-sm font-semibold text-green-700">{msg}</p>}

      {/* RICEVUTA */}
      {ricevuta && ricevuta.length > 0 && (
        <div className="mt-4 rounded-xl border border-[#e3eed7] bg-[#fcfdfa] p-4">
          <h4 className="font-display text-lg text-green-800">🧾 Ricevuta — cosa abbiamo capito dal tuo materiale</h4>
          <ol className="mt-2 space-y-1 text-sm text-green-900/85">
            {ricevuta.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ol>
        </div>
      )}

      {/* PRODOTTI EDITABILI: l'azienda completa le descrizioni e corregge i nomi */}
      {prodotti && prodotti.length > 0 && (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-semibold text-green-800">
            ✍️ Controlla e completa (le <strong>descrizioni mancanti le scrivi tu</strong>):
          </p>
          {prodotti.map((p, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-[#e3eed7] bg-white p-3">
              {p.foto_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.foto_url} alt="" className="h-16 w-16 flex-none rounded-lg object-cover" />
              ) : (
                <span className="flex h-16 w-16 flex-none items-center justify-center rounded-lg bg-leaf text-[10px] text-green-900/50">
                  no foto
                </span>
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <input
                  className="field !py-1 text-sm font-semibold"
                  value={p.nome}
                  onChange={(e) => aggiorna(i, { nome: e.target.value })}
                  placeholder="Nome prodotto"
                />
                <textarea
                  className="field !py-1 text-sm"
                  rows={2}
                  value={p.descrizione}
                  onChange={(e) => aggiorna(i, { descrizione: e.target.value, descrizione_fornita: e.target.value.trim().length > 0 })}
                  placeholder="Descrizione (scrivila tu: sei responsabile del contenuto)"
                />
                {p.materie_prime.length > 0 && (
                  <div className="text-[11px] text-green-900/60">
                    Materie prime: {p.materie_prime.map((m) => `${m.nome} (${m.origine})`).join(", ")}
                  </div>
                )}
                {p.foto_auto && (
                  <div className="text-[11px] font-semibold text-amber-700">
                    📷 foto reperita dall&apos;IA (open source) — non è una tua foto
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => rimuovi(i)}
                className="flex-none text-xs font-bold text-traffic-red hover:underline"
              >
                ✕
              </button>
            </div>
          ))}
          <button type="button" onClick={salvaModifiche} disabled={salvando} className="btn-ghost text-sm">
            {salvando ? "Salvo…" : "💾 Salva le mie modifiche"}
          </button>
          <p className="text-[11px] text-green-900/55">
            Salvate le modifiche, avvisaci con «Ho caricato tutto». Dopo la nostra verifica potrai pubblicare
            la scheda dalla tua dashboard, approvandola.
          </p>
        </div>
      )}
    </div>
  );
}
