"use client";

import { useState } from "react";
import type { Business, Product } from "@/lib/biofido-data";
import { createServizioBooking, euroCents } from "@/lib/bookings";

/** "€ 15,00" / "15,00" / "15.0" → centesimi. */
function prezzoToCents(s?: string): number {
  if (!s) return 0;
  const cleaned = s.replace(/[^\d.,]/g, "");
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

/**
 * Richiesta di prenotazione di un SERVIZIO extra (visita, laboratorio,
 * esperienza). MVP "paga dopo conferma": il cliente invia la richiesta; il
 * produttore la conferma in dashboard; poi al cliente arriva il link Stripe.
 */
export function RichiestaServizioModal({
  business,
  servizio,
  demo,
  onClose,
}: {
  business: Business;
  servizio: Product;
  demo: boolean;
  onClose: () => void;
}) {
  const prezzoCents = prezzoToCents(servizio.price);
  const [persone, setPersone] = useState(1);
  const [data, setData] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const totaleCents = prezzoCents * Math.max(1, persone);

  async function submit() {
    if (!nome.trim() || !email.trim() || !data) {
      setErr("Compila nome, email e data.");
      return;
    }
    setSaving(true);
    setErr(null);
    if (demo || !business.owner) {
      setSaving(false);
      setDone(true);
      return;
    }
    const { error } = await createServizioBooking({
      ownerId: business.owner,
      ownerPlan: business.plan,
      servizioNome: servizio.name,
      prezzoCents,
      prodottoId: servizio.id,
      voceId: servizio.voceId,
      clienteNome: nome,
      clienteEmail: email,
      clienteTel: tel,
      dataRichiesta: data,
      persone,
      note,
    });
    setSaving(false);
    if (error) setErr(error);
    else setDone(true);
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
              Richiedi prenotazione
            </div>
            <h3 className="font-display text-2xl text-green-800">{servizio.name}</h3>
            <p className="text-sm text-green-900/65">{business.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl leading-none text-green-900/50 hover:text-green-900"
            aria-label="Chiudi"
          >
            ×
          </button>
        </div>

        {done ? (
          <div className="mt-6 rounded-xl bg-leaf p-5 text-center">
            <div className="text-4xl">🐾</div>
            <p className="mt-2 font-semibold text-green-800">Richiesta inviata!</p>
            <p className="mt-1 text-sm text-green-900/75">
              {business.name} riceverà la tua richiesta. Alla <strong>conferma</strong> ti
              arriverà il link per <strong>pagare online</strong> in sicurezza.
            </p>
            <button className="btn-lime mt-5" onClick={onClose}>
              Chiudi
            </button>
          </div>
        ) : (
          <>
            {servizio.description && (
              <p className="mt-3 rounded-xl bg-leaf/50 p-3 text-sm text-green-900/80">
                {servizio.description}
              </p>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="label">Data *</span>
                <input type="date" className="field mt-1" value={data} onChange={(e) => setData(e.target.value)} />
              </label>
              <label className="block">
                <span className="label">Persone *</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  className="field mt-1"
                  value={persone}
                  onChange={(e) => setPersone(Math.max(1, Number(e.target.value)))}
                />
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
              <label className="block sm:col-span-2">
                <span className="label">Note (facoltative)</span>
                <textarea
                  className="field mt-1"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Esigenze particolari, fascia oraria…"
                />
              </label>
            </div>

            {prezzoCents > 0 && (
              <div className="mt-4 flex items-center justify-between rounded-xl bg-leaf px-4 py-3">
                <span className="text-sm font-semibold text-green-800">Totale stimato</span>
                <span className="font-display text-2xl text-green-700">{euroCents(totaleCents)}</span>
              </div>
            )}

            {err && <p className="mt-3 text-sm font-semibold text-traffic-red">{err}</p>}

            <button className="btn-lime mt-4 w-full justify-center" onClick={submit} disabled={saving}>
              {saving ? "Invio…" : "Invia richiesta di prenotazione"}
            </button>
            <p className="mt-2 text-center text-[11px] text-green-900/55">
              Nessun pagamento ora: invii una richiesta, il produttore conferma e poi paghi online.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
