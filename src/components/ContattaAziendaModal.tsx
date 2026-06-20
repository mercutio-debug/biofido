"use client";

import { useState } from "react";
import type { Business } from "@/lib/biofido-data";
import { createContatto } from "@/lib/contatti";
import { PORTALE } from "@/lib/portale";
import { Turnstile, turnstileAttivo } from "@/components/Turnstile";

/**
 * "Contatta l'azienda": chat leggera per il cliente (anche ospite). Scrive nome
 * ed email una sola volta, poi può inviare uno o più messaggi: ognuno viene
 * salvato in `contatti` e — via webhook → notify — recapitato all'azienda per
 * email. I messaggi inviati restano elencati come in una chat.
 */
export function ContattaAziendaModal({
  business,
  onClose,
}: {
  business: Business;
  onClose: () => void;
}) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [testo, setTesto] = useState("");
  const [inviati, setInviati] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);

  // dati cliente bloccati dopo il primo invio (resta la chat aperta)
  const iniziato = inviati.length > 0;

  async function invia() {
    setErr(null);
    if (!nome.trim() || !email.trim()) {
      setErr("Inserisci nome ed email così l'azienda può risponderti.");
      return;
    }
    if (!testo.trim()) return;
    if (turnstileAttivo && !captcha && !iniziato) {
      setErr("Conferma di non essere un robot.");
      return;
    }
    setSending(true);
    const { error } = await createContatto({
      azienda: business.owner ?? "",
      nomeCliente: nome.trim(),
      emailCliente: email.trim(),
      messaggio: testo.trim(),
      portale: PORTALE,
    });
    setSending(false);
    if (error) {
      setErr(error);
      return;
    }
    setInviati((prev) => [...prev, testo.trim()]);
    setTesto("");
    // il token Turnstile è monouso: ne preparo uno nuovo
    setCaptcha(null);
    setCaptchaKey((k) => k + 1);
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
              Contatta l&apos;azienda
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

        {/* dati del cliente (una volta sola) */}
        {!iniziato && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
                placeholder="così l'azienda ti risponde"
              />
            </label>
          </div>
        )}

        {/* chat: messaggi inviati */}
        {iniziato && (
          <div className="mt-4 space-y-2 rounded-xl border border-[#e3eed7] bg-leaf/40 p-3">
            {inviati.map((m, i) => (
              <div key={i} className="flex justify-end">
                <span className="max-w-[80%] rounded-2xl bg-green-700 px-3 py-1.5 text-sm text-white">
                  {m}
                </span>
              </div>
            ))}
            <p className="text-center text-[11px] text-green-900/55">
              Messaggio inviato a {business.name}. Ti risponderà via email a{" "}
              <strong>{email}</strong>.
            </p>
          </div>
        )}

        {/* casella messaggio */}
        <div className="mt-3">
          <textarea
            className="field"
            rows={3}
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            placeholder="Scrivi il tuo messaggio all'azienda…"
          />
        </div>

        {!iniziato && <Turnstile key={captchaKey} onToken={setCaptcha} />}

        {err && <p className="mt-2 text-sm font-semibold text-traffic-red">{err}</p>}

        <button
          className="btn-lime mt-3 w-full justify-center"
          onClick={invia}
          disabled={sending || !testo.trim()}
        >
          {sending ? "Invio…" : iniziato ? "Invia un altro messaggio" : "Invia messaggio"}
        </button>
        <p className="mt-2 text-center text-[11px] text-green-900/55">
          Il tuo messaggio arriva all&apos;azienda anche via email, così lo vede subito.
        </p>
      </div>
    </div>
  );
}
