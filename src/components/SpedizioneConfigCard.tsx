"use client";

import { useEffect, useState } from "react";
import {
  loadSpedizioneConfig,
  saveSpedizioneConfig,
  type SpedizioneConfig,
} from "@/lib/spedizione";
import { euroToCents } from "@/lib/prezzo";
import { ImportoInput } from "@/components/ImportoInput";

const centsToStr = (c: number | null) =>
  c == null || c <= 0 ? "" : "€ " + (c / 100).toLocaleString("it-IT", { minimumFractionDigits: 2 });

/**
 * Regola di spedizione dell'azienda (MVP): tariffa fissa per ordine + soglia
 * «gratis sopra X». La paga il cliente al checkout; la incassa l'azienda (che
 * spedisce). Costo 0 = spedizione sempre gratis / inclusa nel prezzo.
 */
export function SpedizioneConfigCard() {
  const [costo, setCosto] = useState("");
  const [soglia, setSoglia] = useState("");
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
    };
    const { error } = await saveSpedizioneConfig(config);
    setSaving(false);
    setMsg(error ? "Errore: " + error : "Spedizione salvata ✓");
  }

  if (loading) return null;
  const costoCents = euroToCents(costo) ?? 0;

  return (
    <section className="card mt-6 p-6">
      <h2 className="font-display text-2xl text-green-800">🚚 Spedizione</h2>
      <p className="mt-1 text-sm text-green-900/70">
        La tariffa che il cliente paga alla cassa e che <strong>incassi tu</strong> (per pagare il
        corriere). Metti <strong>0</strong> se la spedizione è gratis o già inclusa nel prezzo.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">Costo spedizione per ordine</span>
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
      <p className="mt-3 rounded-xl bg-leaf/40 p-3 text-xs text-green-900/75">
        {costoCents <= 0
          ? "Spedizione gratuita per il cliente."
          : soglia.trim()
            ? `Il cliente paga ${centsToStr(costoCents)} di spedizione, gratis sopra ${soglia.trim().startsWith("€") ? soglia.trim() : "€ " + soglia.trim()} di prodotti.`
            : `Il cliente paga ${centsToStr(costoCents)} di spedizione su ogni ordine.`}
      </p>
      <div className="mt-4 flex items-center gap-3">
        <button className="btn-lime" onClick={salva} disabled={saving}>
          {saving ? "Salvataggio…" : "Salva spedizione"}
        </button>
        {msg && <span className="text-sm font-semibold text-green-700">{msg}</span>}
      </div>
    </section>
  );
}
