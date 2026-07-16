"use client";

import { useState } from "react";
import { estraiOnboarding, type ProdottoEstratto } from "@/lib/onboarding-ai";

type FileMin = { url: string; tipo?: string | null; nome?: string };

/** true se il file caricato è un'immagine (per l'analisi vision). */
function isImg(f: FileMin): boolean {
  if (f.tipo && /^image\//i.test(f.tipo)) return true;
  return /\.(png|jpe?g|webp|gif|bmp)$/i.test(f.url || "");
}

/**
 * Analisi AI del materiale di onboarding. Trasparente per principio:
 *  - NON inventa descrizioni (se assenti → solo il nome; la scrive l'azienda);
 *  - se manca la foto, ne reperisce una OPEN SOURCE e lo segnala;
 *  - mostra una RICEVUTA di cosa è stato caricato e cosa ha fatto l'IA.
 * Il disclaimer è sempre visibile accanto alla cornice.
 */
export function OnboardingAnalisiAI({ files, portale }: { files: FileMin[]; portale: string }) {
  const [testo, setTesto] = useState("");
  const [loading, setLoading] = useState(false);
  const [prodotti, setProdotti] = useState<ProdottoEstratto[] | null>(null);
  const [ricevuta, setRicevuta] = useState<string[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const immagini = files.filter(isImg).map((f) => f.url);
  const isBio = portale === "BioFido";

  async function analizza() {
    setLoading(true);
    setMsg(null);
    setProdotti(null);
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
            usiamo <strong>solo il nome</strong>. La descrizione la aggiungi tu — sei tu a conoscere e garantire i tuoi prodotti.
          </li>
          <li>
            Se manca la <strong>foto</strong>, ne cerchiamo una <strong>open source</strong> (licenze libere) attinente al
            tipo di prodotto, e te lo segnaliamo nella ricevuta (così sai che non è una tua foto).
          </li>
          <li>
            {isBio
              ? "L'origine delle materie prime (il semaforo della filiera) è facoltativa: la riportiamo solo se la dichiari."
              : "L'origine delle materie prime (per il semaforo della filiera) la riportiamo solo se la dichiari — non la inventiamo."}
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
          placeholder="Es. «Produco olio essenziale di lavanda e marmellata di mele. La lavanda è di Nava.» — scrivi qui anche eventuali descrizioni che vuoi usare."
        />
      </label>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={analizza}
          disabled={loading || (immagini.length === 0 && !testo.trim())}
          className="btn-lime text-sm disabled:opacity-50"
        >
          {loading ? "Analizzo il materiale…" : "🔎 Analizza foto e testo"}
        </button>
        <span className="text-xs text-green-900/55">
          {immagini.length > 0 ? `${immagini.length} foto pronte da analizzare` : "Nessuna foto: caricane sopra o scrivi le note"}
        </span>
      </div>
      {msg && <p className="mt-2 text-sm font-semibold text-traffic-red">{msg}</p>}

      {/* RICEVUTA */}
      {ricevuta && (
        <div className="mt-4 rounded-xl border border-[#e3eed7] bg-[#fcfdfa] p-4">
          <h4 className="font-display text-lg text-green-800">🧾 Ricevuta — cosa abbiamo capito dal tuo materiale</h4>
          {ricevuta.length === 0 ? (
            <p className="mt-1 text-sm text-green-900/70">
              Non siamo riusciti a riconoscere prodotti. Aggiungi qualche nota o una foto più chiara e riprova.
            </p>
          ) : (
            <ol className="mt-2 space-y-1 text-sm text-green-900/85">
              {ricevuta.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ol>
          )}
          <p className="mt-2 text-[11px] text-green-900/55">
            Questa è la base con cui costruiamo la tua scheda. Le descrizioni mancanti restano da completare a tua cura.
          </p>
        </div>
      )}

      {/* prodotti estratti (anteprima) */}
      {prodotti && prodotti.length > 0 && (
        <div className="mt-4 space-y-2">
          {prodotti.map((p, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-[#e3eed7] bg-white p-3">
              {p.foto_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.foto_url} alt="" className="h-14 w-14 flex-none rounded-lg object-cover" />
              ) : (
                <span className="flex h-14 w-14 flex-none items-center justify-center rounded-lg bg-leaf text-[10px] text-green-900/50">
                  no foto
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-green-800">
                  {p.nome || "(senza nome)"}
                  {p.categoria && <span className="ml-2 text-xs font-normal text-lime-600">{p.categoria}</span>}
                </div>
                <div className="text-xs text-green-900/70">
                  {p.descrizione_fornita ? p.descrizione : <em className="text-green-900/45">descrizione da aggiungere (usiamo solo il nome)</em>}
                </div>
                {p.materie_prime.length > 0 && (
                  <div className="mt-1 text-[11px] text-green-900/60">
                    Materie prime: {p.materie_prime.map((m) => `${m.nome} (${m.origine})`).join(", ")}
                  </div>
                )}
                {p.foto_auto && (
                  <div className="mt-1 text-[11px] font-semibold text-amber-700">
                    📷 foto reperita dall'IA (open source) — non è una tua foto
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
