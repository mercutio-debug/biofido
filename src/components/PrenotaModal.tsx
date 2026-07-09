"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Business } from "@/lib/biofido-data";
import { createBookingRequest, euroCents } from "@/lib/bookings";
import { payBooking, ownerPuoIncassare } from "@/lib/connect";
import { billingEnabled } from "@/lib/billing";
import { supabase } from "@/lib/supabase";
import { loadAnagraficaCliente, anagraficaClienteCompleta } from "@/lib/clienti";
import Link from "next/link";

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
  // anagrafica cliente: obbligatoria per prenotare (null = sto controllando)
  const [anagOk, setAnagOk] = useState<boolean | null>(null);
  useEffect(() => {
    loadAnagraficaCliente().then((a) => setAnagOk(anagraficaClienteCompleta(a)));
  }, []);
  // l'azienda può incassare? se i pagamenti sono attivi ma l'azienda non ha
  // completato Stripe Connect, blocco la prenotazione (niente richieste non pagabili).
  const [ownerOk, setOwnerOk] = useState<boolean | null>(null);
  useEffect(() => {
    if (!billingEnabled || demo) {
      setOwnerOk(true);
      return;
    }
    ownerPuoIncassare(business.owner).then(setOwnerOk);
  }, [demo, business.owner]);

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
    if (ownerOk === false) {
      setErr("Questa azienda non accetta ancora prenotazioni online.");
      return;
    }
    if (anagOk === false) {
      setErr("Completa prima i tuoi dati (anagrafica) per poter prenotare.");
      return;
    }
    if (!exp) {
      setErr("Nessuna esperienza disponibile da prenotare. Ricarica la pagina o riprova.");
      return;
    }
    if (!nome.trim() || !email.trim() || !tel.trim() || !data) {
      setErr("Compila nome, email, telefono e data: il telefono serve all'azienda per confermare l'esperienza.");
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
                <div className="mt-1 flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="Diminuisci"
                    onClick={() => setPersone((n) => Math.max(1, n - 1))}
                    disabled={persone <= 1}
                    className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-[#cfe3b8] bg-white text-2xl font-bold text-green-700 disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="min-w-[2.5rem] text-center font-display text-2xl text-green-800">
                    {persone}
                  </span>
                  <button
                    type="button"
                    aria-label="Aumenta"
                    onClick={() => setPersone((n) => Math.min(exp?.maxPersone ?? 20, n + 1))}
                    disabled={persone >= (exp?.maxPersone ?? 20)}
                    className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-[#cfe3b8] bg-white text-2xl font-bold text-green-700 disabled:opacity-40"
                  >
                    +
                  </button>
                  {exp?.maxPersone ? (
                    <span className="text-[11px] text-green-900/55">max {exp.maxPersone}</span>
                  ) : null}
                </div>
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
                <span className="label">Telefono *</span>
                <input
                  type="tel"
                  className="field mt-1"
                  value={tel}
                  onChange={(e) => setTel(e.target.value)}
                  placeholder="es. 333 1234567"
                />
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

            {ownerOk === false ? (
              <div className="mt-4 rounded-xl border-2 border-stone-300 bg-stone-50 p-3 text-sm text-stone-700">
                🔒 <strong>Questa azienda non accetta ancora prenotazioni online.</strong> Non ha
                completato l&apos;attivazione dei pagamenti. Riprova più avanti o contattala
                direttamente.
              </div>
            ) : anagOk === false ? (
              <div className="mt-4 rounded-xl border-2 border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                ⚠️ Per prenotare devi prima <strong>completare i tuoi dati</strong> (nome, codice
                fiscale, indirizzo): servono all&apos;azienda per la fattura.{" "}
                <Link href="/account#anagrafica-cliente" className="font-bold underline">
                  Completa ora i tuoi dati →
                </Link>
              </div>
            ) : (
              <>
                <div className="mt-4 rounded-xl bg-leaf/60 p-3 text-xs text-green-900/80">
                  💳 <strong>Come funziona il pagamento:</strong> paghi ora, ma l&apos;importo resta{" "}
                  <strong>bloccato</strong> (non ti viene addebitato) finché l&apos;azienda non{" "}
                  <strong>approva</strong> la prenotazione. Quando approva, l&apos;importo viene
                  incassato; se <strong>rifiuta</strong>, il blocco si libera e <strong>non paghi
                  nulla</strong>.
                </div>
                <button
                  className="btn-lime mt-3 w-full justify-center"
                  onClick={submit}
                  disabled={saving || anagOk === null || ownerOk === null}
                >
                  {saving ? "Attendi…" : "Prenota e paga (bloccato fino all'approvazione)"}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
