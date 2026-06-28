"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Business } from "@/lib/biofido-data";
import { createBookingRequest, euroCents } from "@/lib/bookings";
import { payBooking } from "@/lib/connect";
import { billingEnabled } from "@/lib/billing";
import { supabase } from "@/lib/supabase";

/**
 * Modulo "Prenota un'esperienza" (MVP: richiesta da confermare, nessun
 * pagamento online). Il cliente sceglie un'esperienza, data e n° persone e
 * lascia i contatti; al produttore arriva la richiesta in dashboard.
 *
 * In modalità demo (dati offline) non scrive su database: mostra solo la
 * conferma, così il flusso è navigabile anche senza Supabase.
 */
export function PrenotaModal({
  business,
  demo,
  onClose,
}: {
  business: Business;
  demo: boolean;
  onClose: () => void;
}) {
  const experiences = business.experiences ?? [];
  const [expId, setExpId] = useState(experiences[0]?.id ?? "");
  const exp = experiences.find((e) => e.id === expId) ?? experiences[0];

  const [persone, setPersone] = useState(1);
  const [data, setData] = useState("");
  const [orarioCliente, setOrarioCliente] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // agenda dell'esperienza: giorni ammessi (1=lun…7=dom) e orario fisso, se impostati
  const GIORNI_LAB = ["", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
  const giorniAmmessi = exp?.giorniSettimana ?? [];
  const orarioFisso = exp?.orario || "";
  const weekdayOf = (iso: string) => {
    const g = new Date(iso + "T00:00:00").getDay();
    return g === 0 ? 7 : g; // domenica: JS=0 → 7
  };
  const giornoOk = !data || giorniAmmessi.length === 0 || giorniAmmessi.includes(weekdayOf(data));

  // blocca lo scroll di sfondo finché il modale è aperto (no shift di pagina su mobile)
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const totaleCents = exp ? exp.prezzoCents * persone : 0;

  async function submit() {
    if (!exp) {
      setErr("Nessuna esperienza disponibile da prenotare. Ricarica la pagina o riprova.");
      return;
    }
    if (!nome.trim() || !email.trim() || !data) {
      setErr("Compila nome, email e data.");
      return;
    }
    if (!giornoOk) {
      setErr(
        "Questa attività si svolge solo di: " +
          giorniAmmessi.map((g) => GIORNI_LAB[g]).join(", ") +
          ". Scegli una di queste giornate.",
      );
      return;
    }
    setSaving(true);
    setErr(null);

    if (demo) {
      // demo offline: nessun database, conferma simulata
      setSaving(false);
      setDone(true);
      return;
    }

    const { error, id } = await createBookingRequest({
      esperienza: exp,
      ownerPlan: business.plan,
      clienteNome: nome,
      clienteEmail: email,
      clienteTel: tel,
      dataRichiesta: data,
      orario: orarioFisso || orarioCliente || undefined,
      persone,
      note,
    });
    if (error) {
      setSaving(false);
      setErr(error);
      return;
    }
    // se il cliente è loggato e i pagamenti sono attivi, va SUBITO ad autorizzare il
    // pagamento (fondi bloccati). L'azienda poi approva (cattura) o rifiuta (annulla).
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (id && billingEnabled && session) {
      try {
        await payBooking(id); // redirect a Stripe
        return; // stiamo reindirizzando
      } catch (e) {
        setSaving(false);
        setErr(
          (e as Error).message +
            " La richiesta è salvata: puoi completare il pagamento da «Le mie prenotazioni».",
        );
        return;
      }
    }
    setSaving(false);
    setDone(true);
  }

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="card max-h-[92dvh] w-full max-w-lg overflow-y-auto overflow-x-hidden overscroll-contain p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-lime-500">
              Prenota un&apos;esperienza
            </div>
            <h3 className="font-display text-2xl text-green-800">{business.name}</h3>
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
            <p className="mt-2 font-semibold text-green-800">
              Richiesta inviata!
            </p>
            <p className="mt-1 text-sm text-green-900/75">
              {business.name} riceverà la tua richiesta e ti contatterà a{" "}
              <strong>{email || "la tua email"}</strong> per confermare.
            </p>
            <button className="btn-lime mt-5" onClick={onClose}>
              Chiudi
            </button>
          </div>
        ) : (
          <>
            {/* scelta esperienza */}
            <div className="mt-4 space-y-2">
              {experiences.map((e) => (
                <label
                  key={e.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${
                    e.id === expId
                      ? "border-lime-500 bg-leaf/50"
                      : "border-[#e3eed7] bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="exp"
                    className="mt-1 accent-[var(--lime-500)]"
                    checked={e.id === expId}
                    onChange={() => setExpId(e.id)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-green-800">{e.titolo}</span>
                      <span className="font-display text-green-700">
                        {euroCents(e.prezzoCents)}
                      </span>
                    </span>
                    {e.descrizione && (
                      <span className="block text-xs text-green-900/65">
                        {e.descrizione}
                      </span>
                    )}
                    {e.durataMin && (
                      <span className="block text-[11px] text-green-900/50">
                        Durata ~{e.durataMin} min · max {e.maxPersone} persone
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>

            {/* dati prenotazione */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="label">Data *</span>
                <input
                  type="date"
                  className={`field mt-1 ${data && !giornoOk ? "border-traffic-red" : ""}`}
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                />
                {giorniAmmessi.length > 0 && (
                  <span
                    className={`mt-1 block text-[11px] ${
                      data && !giornoOk ? "font-bold text-traffic-red" : "text-green-900/60"
                    }`}
                  >
                    Disponibile solo: {giorniAmmessi.map((g) => GIORNI_LAB[g]).join(", ")}
                  </span>
                )}
              </label>
              {/* orario: fissato dall'azienda (bloccato) oppure preferenza del cliente */}
              {orarioFisso ? (
                <label className="block">
                  <span className="label">Orario</span>
                  <input type="time" className="field mt-1 bg-leaf/40" value={orarioFisso} readOnly />
                  <span className="mt-1 block text-[11px] text-green-900/60">
                    Orario fissato dall&apos;azienda. Puoi chiedere una modifica nel messaggio.
                  </span>
                </label>
              ) : (
                <label className="block">
                  <span className="label">Orario preferito</span>
                  <input
                    type="time"
                    className="field mt-1"
                    value={orarioCliente}
                    onChange={(e) => setOrarioCliente(e.target.value)}
                  />
                </label>
              )}
              <label className="block">
                <span className="label">Persone *</span>
                <input
                  type="number"
                  min={1}
                  max={exp?.maxPersone ?? 20}
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
                <input
                  type="email"
                  className="field mt-1"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
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
                  placeholder="Allergie, esigenze particolari…"
                />
              </label>
            </div>

            {/* totale */}
            <div className="mt-4 flex items-center justify-between rounded-xl bg-leaf px-4 py-3">
              <span className="text-sm font-semibold text-green-800">Totale stimato</span>
              <span className="font-display text-2xl text-green-700">
                {euroCents(totaleCents)}
              </span>
            </div>

            {err && (
              <p className="mt-3 text-sm font-semibold text-traffic-red">{err}</p>
            )}

            <div className="mt-4 rounded-xl bg-leaf/60 p-3 text-xs text-green-900/80">
              💳 <strong>Come funziona il pagamento:</strong> paghi ora, ma l&apos;importo resta{" "}
              <strong>bloccato</strong> (non ti viene addebitato) finché l&apos;azienda non{" "}
              <strong>approva</strong> la prenotazione. Quando approva, l&apos;importo viene
              incassato; se <strong>rifiuta</strong>, il blocco si libera e <strong>non paghi
              nulla</strong>.
            </div>
            <button className="btn-lime mt-3 w-full justify-center" onClick={submit} disabled={saving}>
              {saving ? "Attendi…" : "Prenota e paga (bloccato fino all'approvazione)"}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
