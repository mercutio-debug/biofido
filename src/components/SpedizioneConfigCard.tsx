"use client";

import { useEffect, useState } from "react";
import {
  loadSpedizioneConfig,
  saveSpedizioneConfig,
  calcolaSpedizioneCents,
  spedizioneLabel,
  type SpedizioneConfig,
} from "@/lib/spedizione";
import { euroToCents } from "@/lib/prezzo";
import { ImportoInput } from "@/components/ImportoInput";

const centsToStr = (c: number | null) =>
  c == null || c <= 0 ? "" : "€ " + (c / 100).toLocaleString("it-IT", { minimumFractionDigits: 2 });

/**
 * Regola di spedizione dell'azienda. Tariffa base (primo collo) + soglia «gratis
 * sopra X». Facoltativo: modello «a colli» che scala con la quantità (in una
 * scatola stanno N pezzi; oltre, ogni scatola in più costa X). La paga il cliente
 * al checkout; la incassa l'azienda (che spedisce). Costo base 0 = spedizione
 * sempre gratis / inclusa nel prezzo.
 */
export function SpedizioneConfigCard() {
  const [costo, setCosto] = useState("");
  const [soglia, setSoglia] = useState("");
  const [pezzi, setPezzi] = useState(""); // pezzi per collo (vuoto = tariffa fissa)
  const [costoExtra, setCostoExtra] = useState(""); // costo collo aggiuntivo
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    // owner viene dedotto lato save (utente loggato); qui carico la SUA config
    (async () => {
      const {
        data: { user },
      } = await (await import("@/lib/supabase")).supabase.auth.getUser();
      if (!user) {
        if (vivo) setLoading(false);
        return;
      }
      const c = await loadSpedizioneConfig(user.id);
      if (vivo) {
        setCosto(centsToStr(c.costoCents));
        setSoglia(centsToStr(c.gratisSopraCents));
        setPezzi(c.pezziPerCollo && c.pezziPerCollo > 0 ? String(c.pezziPerCollo) : "");
        setCostoExtra(centsToStr(c.costoColloExtraCents));
        setLoading(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  async function salva() {
    setSaving(true);
    setMsg(null);
    const config: SpedizioneConfig = {
      modalita: "fissa",
      costoCents: euroToCents(costo) ?? 0,
      gratisSopraCents: soglia.trim() ? euroToCents(soglia) : null,
      pezziPerCollo: pezzi.trim() ? Math.max(0, parseInt(pezzi, 10) || 0) : null,
      costoColloExtraCents: costoExtra.trim() ? euroToCents(costoExtra) : null,
    };
    const { error } = await saveSpedizioneConfig(config);
    setSaving(false);
    setMsg(error ? "Errore: " + error : "Spedizione salvata ✓");
  }

  if (loading) return null;
  const costoCents = euroToCents(costo) ?? 0;
  const perCollo = pezzi.trim() ? Math.max(0, parseInt(pezzi, 10) || 0) : 0;
  const configAnteprima: SpedizioneConfig = {
    modalita: "fissa",
    costoCents,
    gratisSopraCents: null, // in anteprima ignoro la soglia gratis: mostro il puro scaling
    pezziPerCollo: perCollo > 0 ? perCollo : null,
    costoColloExtraCents: costoExtra.trim() ? euroToCents(costoExtra) : null,
  };
  // qualche quantità d'esempio per far capire lo scaling (subtotale 0 = niente "gratis")
  const esempi = perCollo > 0 ? [1, perCollo, perCollo + 1, Math.max(perCollo * 4, 20)] : [];

  return (
    <section className="card mt-6 p-6">
      <h2 className="font-display text-2xl text-green-800">🚚 Spedizione</h2>
      <p className="mt-1 text-sm text-green-900/70">
        La tariffa che il cliente paga alla cassa e che <strong>incassi tu</strong> (per pagare il
        corriere). Metti <strong>0</strong> nel costo base se la spedizione è gratis o già inclusa
        nel prezzo.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">Costo base (una spedizione / prima scatola)</span>
          <div className="mt-1">
            <ImportoInput value={costo} onChange={setCosto} placeholder="€ 7,00" />
          </div>
        </label>
        <label className="block">
          <span className="label">
            Gratis sopra <span className="font-normal text-green-900/50">(facoltativo)</span>
          </span>
          <div className="mt-1">
            <ImportoInput value={soglia} onChange={setSoglia} placeholder="€ 50,00" />
          </div>
          <span className="mt-1 block text-[11px] text-green-900/55">
            Sopra questo importo di prodotti, la spedizione è gratis. Vuoto = mai gratis.
          </span>
        </label>
      </div>

      {/* Scaling a colli: facoltativo. Vuoto = tariffa fissa per ordine. */}
      <div className="mt-5 rounded-2xl border border-[#e3eed7] bg-leaf/20 p-4">
        <h3 className="text-sm font-bold text-green-800">
          📦 Scala con la quantità <span className="font-normal text-green-900/50">(facoltativo)</span>
        </h3>
        <p className="mt-1 text-[12px] text-green-900/65">
          Se un cliente ordina tanti pezzi, servono più scatole. Indica quanti pezzi entrano in una
          spedizione: oltre quella soglia parte una scatola in più. Lascia vuoto per tenere la
          tariffa fissa uguale per tutti gli ordini.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Pezzi per scatola</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={pezzi}
              onChange={(e) => setPezzi(e.target.value)}
              placeholder="es. 6"
              className="mt-1 w-full rounded-xl border border-[#cfe0bb] bg-white px-3 py-2 text-green-900 outline-none focus:border-green-600"
            />
          </label>
          <label className="block">
            <span className="label">
              Costo scatola aggiuntiva{" "}
              <span className="font-normal text-green-900/50">(vuoto = come il base)</span>
            </span>
            <div className="mt-1">
              <ImportoInput value={costoExtra} onChange={setCostoExtra} placeholder={costo || "€ 6,00"} />
            </div>
          </label>
        </div>
      </div>

      {/* Anteprima del calcolo */}
      <div className="mt-3 rounded-xl bg-leaf/40 p-3 text-xs text-green-900/80">
        {costoCents <= 0 ? (
          "Spedizione gratuita per il cliente."
        ) : perCollo > 0 ? (
          <>
            <div className="font-semibold text-green-800">Anteprima (una scatola ogni {perCollo} pezzi):</div>
            <ul className="mt-1 space-y-0.5">
              {esempi.map((n) => (
                <li key={n} className="flex justify-between">
                  <span>{n === 1 ? "1 pezzo" : `${n} pezzi`}</span>
                  <span className="font-semibold">
                    {spedizioneLabel(calcolaSpedizioneCents(configAnteprima, 0, n))}
                  </span>
                </li>
              ))}
            </ul>
            {soglia.trim() && (
              <div className="mt-1 text-green-900/60">
                …e comunque gratis sopra{" "}
                {soglia.trim().startsWith("€") ? soglia.trim() : "€ " + soglia.trim()} di prodotti.
              </div>
            )}
          </>
        ) : soglia.trim() ? (
          `Il cliente paga ${centsToStr(costoCents)} di spedizione, gratis sopra ${soglia.trim().startsWith("€") ? soglia.trim() : "€ " + soglia.trim()} di prodotti.`
        ) : (
          `Il cliente paga ${centsToStr(costoCents)} di spedizione su ogni ordine.`
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button className="btn-lime" onClick={salva} disabled={saving}>
          {saving ? "Salvataggio…" : "Salva spedizione"}
        </button>
        {msg && <span className="text-sm font-semibold text-green-700">{msg}</span>}
      </div>
    </section>
  );
}
