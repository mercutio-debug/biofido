"use client";

import { useState } from "react";
import { segnalaAnnuncio } from "@/lib/ordini";

const MOTIVI = [
  { id: "frode", label: "Sospetto di frode / truffa" },
  { id: "illecito", label: "Contenuto illecito o vietato" },
  { id: "contraffazione", label: "Contraffazione / prodotto falso" },
  { id: "altro", label: "Altro" },
];

/** Segnalazione di un annuncio del catalogo (notice-and-action DSA). */
export function SegnalaModal({
  catalogoId,
  prodottoNome,
  portale,
  onClose,
}: {
  catalogoId: string;
  prodottoNome?: string;
  portale?: string;
  onClose: () => void;
}) {
  const [motivo, setMotivo] = useState("frode");
  const [dettaglio, setDettaglio] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function invia() {
    setSaving(true);
    setErr(null);
    const { error } = await segnalaAnnuncio({ catalogoId, motivo, dettaglio, email, portale });
    setSaving(false);
    if (error) setErr(error);
    else setDone(true);
  }

  return (
    <div
      className="fixed inset-0 z-[2100] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="card max-h-[92vh] w-full max-w-md overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-xl text-green-800">Segnala annuncio</h3>
          <button
            onClick={onClose}
            aria-label="Chiudi"
            className="text-2xl leading-none text-green-900/50 hover:text-green-900"
          >
            ×
          </button>
        </div>

        {done ? (
          <div className="mt-5 rounded-xl bg-leaf p-5 text-center">
            <div className="text-3xl">✅</div>
            <p className="mt-2 font-semibold text-green-800">Segnalazione inviata</p>
            <p className="mt-1 text-sm text-green-900/75">Grazie: la esamineremo al più presto.</p>
            <button className="btn-lime mt-4" onClick={onClose}>
              Chiudi
            </button>
          </div>
        ) : (
          <>
            {prodottoNome && <p className="mt-1 text-sm text-green-900/65">{prodottoNome}</p>}
            <label className="mt-4 block">
              <span className="label">Motivo</span>
              <select
                className="field mt-1"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              >
                {MOTIVI.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block">
              <span className="label">Dettagli (facoltativi)</span>
              <textarea
                className="field mt-1"
                rows={3}
                value={dettaglio}
                onChange={(e) => setDettaglio(e.target.value)}
              />
            </label>
            <label className="mt-3 block">
              <span className="label">La tua email (facoltativa)</span>
              <input
                type="email"
                className="field mt-1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="per ricontattarti"
              />
            </label>
            {err && <p className="mt-3 text-sm font-semibold text-traffic-red">{err}</p>}
            <button
              className="btn-lime mt-4 w-full justify-center"
              onClick={invia}
              disabled={saving}
            >
              {saving ? "Invio…" : "Invia segnalazione"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
