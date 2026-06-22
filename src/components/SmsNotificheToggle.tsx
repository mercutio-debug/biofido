"use client";

import { useEffect, useState } from "react";
import { getMyPlan } from "@/lib/plan";
import { loadSmsPreferenze, saveSmsPreferenze } from "@/lib/sms";

/**
 * Spunta GOLD: "Avvisami via SMS quando ricevo un ordine".
 * Si mostra solo alle aziende Gold. Salva la preferenza (attivo + numero) in
 * `sms_preferenze`. L'SMS vero parte lato server (stripe-webhook) quando arriva
 * l'ordine, ma solo dopo aver collegato il fornitore SMS — finché non è
 * collegato, la spunta è pronta e non viene inviato nulla.
 */
export function SmsNotificheToggle({ ownerId }: { ownerId: string }) {
  const [gold, setGold] = useState(false);
  const [pronto, setPronto] = useState(false);
  const [attivo, setAttivo] = useState(false);
  const [numero, setNumero] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    getMyPlan().then((p) => setGold(p === "gold"));
    loadSmsPreferenze(ownerId).then((s) => {
      setAttivo(s.attivo);
      setNumero(s.numero);
      setPronto(true);
    });
  }, [ownerId]);

  // funzione riservata ai Gold
  if (!gold) return null;

  async function salva() {
    setMsg(null);
    const num = numero.trim();
    if (attivo && !/^\+?\d[\d\s]{6,}$/.test(num)) {
      setMsg("Inserisci un cellulare valido con prefisso (es. +39 333 1234567).");
      return;
    }
    setSaving(true);
    const { error } = await saveSmsPreferenze(ownerId, { attivo, numero: num });
    setSaving(false);
    setMsg(error ? "Errore: " + error : "Preferenza SMS salvata ✅");
  }

  return (
    <div className="mt-3 rounded-xl border border-badge-yellow bg-[#fffbe9] p-3">
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-[var(--lime-500)]"
          checked={attivo}
          onChange={(e) => setAttivo(e.target.checked)}
        />
        <span className="font-semibold text-green-800">
          📱 Avvisami via SMS quando ricevo un ordine{" "}
          <span className="rounded-full bg-badge-yellow px-2 text-[10px] font-bold text-[#7a1f00]">
            GOLD
          </span>
        </span>
      </label>

      {attivo && (
        <input
          className="field mt-2 max-w-xs"
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          placeholder="Cellulare, es. +39 333 1234567"
          inputMode="tel"
        />
      )}

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button className="btn-lime text-sm" onClick={salva} disabled={saving || !pronto}>
          {saving ? "Salvo…" : "Salva preferenza SMS"}
        </button>
        {msg && <span className="text-xs font-semibold text-green-700">{msg}</span>}
      </div>

      <p className="mt-2 text-[11px] text-green-900/55">
        Servizio in fase di attivazione: la spunta è pronta, gli SMS partiranno appena
        colleghiamo il fornitore.
      </p>
    </div>
  );
}
