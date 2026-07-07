"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import { DatiFatturazioneForm } from "@/components/DatiFatturazioneForm";
import { AnagraficaClienteForm } from "@/components/AnagraficaClienteForm";
import { NotificheToggle } from "@/components/NotificheToggle";
import { SmsNotificheToggle } from "@/components/SmsNotificheToggle";
import { LEGALE } from "@/lib/legale";
import { eliminaAccount } from "@/lib/elimina-account";

/**
 * "Il mio account": area dove il cliente, già loggato, può cambiare l'email di
 * accesso, la password e correggere i dati di fatturazione in qualsiasi momento
 * (non solo all'attivazione del piano).
 */
export default function AccountPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // cambio email
  const [nuovaEmail, setNuovaEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);

  // cambio password
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);

  // eliminazione account: 0 chiuso · 1 avviso · 2 conferma finale
  const [delStep, setDelStep] = useState(0);
  const [delBusy, setDelBusy] = useState(false);
  const [delErr, setDelErr] = useState<string | null>(null);

  async function confermaEliminazione() {
    setDelBusy(true);
    setDelErr(null);
    const { ok, error } = await eliminaAccount();
    if (!ok) {
      setDelBusy(false);
      setDelErr(error ?? "Errore");
      return;
    }
    await supabase.auth.signOut();
    router.replace("/?account=eliminato");
  }

  useEffect(() => {
    if (!loading && !user) router.replace("/accedi");
  }, [loading, user, router]);

  async function cambiaEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailMsg(null);
    const email = nuovaEmail.trim();
    if (!email || !email.includes("@")) {
      setEmailMsg("Inserisci un indirizzo email valido.");
      return;
    }
    if (email.toLowerCase() === user?.email?.toLowerCase()) {
      setEmailMsg("È già la tua email attuale.");
      return;
    }
    setEmailBusy(true);
    const { error } = await supabase.auth.updateUser({ email });
    setEmailBusy(false);
    if (error) {
      setEmailMsg("Errore: " + error.message);
      return;
    }
    setNuovaEmail("");
    setEmailMsg(
      "Ti abbiamo inviato un'email di conferma. Per sicurezza Supabase chiede di confermare il cambio (controlla sia il nuovo sia il vecchio indirizzo). L'email cambierà solo dopo la conferma.",
    );
  }

  async function cambiaPassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdMsg(null);
    if (pwd.length < 8) {
      setPwdMsg("La password deve avere almeno 8 caratteri.");
      return;
    }
    if (pwd !== pwd2) {
      setPwdMsg("Le due password non coincidono.");
      return;
    }
    setPwdBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setPwdBusy(false);
    if (error) {
      setPwdMsg("Errore: " + error.message);
      return;
    }
    setPwd("");
    setPwd2("");
    setPwdMsg("Password aggiornata ✅");
  }

  if (loading || !user) {
    return <p className="mx-auto max-w-3xl px-4 py-12 text-green-900/60">Caricamento…</p>;
  }

  const isCliente =
    (user?.user_metadata as { tipo?: string } | undefined)?.tipo === "cliente";

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="title-pangea text-4xl text-green-700">Il mio account</h1>
      <p className="mt-2 text-green-900/70">
        Aggiorna l&apos;email di accesso, la password e i dati di fatturazione. Lo stesso
        account vale su ECO-VISA e BioFido.
      </p>

      {/* Anagrafica CLIENTE: obbligatoria per ordinare/prenotare */}
      {(user?.user_metadata as { tipo?: string } | undefined)?.tipo === "cliente" && (
        <section id="anagrafica-cliente" className="card mt-8 p-6 scroll-mt-20">
          <h2 className="font-display text-2xl text-green-800">I miei dati</h2>
          <p className="mt-1 text-sm text-green-900/70">
            Nome, codice fiscale e indirizzo: ti servono per <strong>ordinare prodotti</strong> e{" "}
            <strong>prenotare esperienze</strong>. L&apos;azienda li usa per emettere la fattura e
            per la spedizione/il contatto.
          </p>
          <div className="mt-4">
            <AnagraficaClienteForm />
          </div>
        </section>
      )}

      {/* Email */}
      <section className="card mt-8 p-6">
        <h2 className="font-display text-2xl text-green-800">Email di accesso</h2>
        <p className="mt-1 text-sm text-green-900/70">
          Attuale: <strong>{user.email}</strong>
        </p>
        <form onSubmit={cambiaEmail} className="mt-4 space-y-3">
          <label className="block">
            <span className="label">Nuova email</span>
            <input
              type="email"
              className="field mt-1"
              value={nuovaEmail}
              onChange={(e) => setNuovaEmail(e.target.value)}
              placeholder="nuova@email.it"
            />
          </label>
          {emailMsg && (
            <p className="text-sm font-semibold text-green-800">{emailMsg}</p>
          )}
          <button className="btn-lime" disabled={emailBusy || !nuovaEmail.trim()}>
            {emailBusy ? "Invio…" : "Cambia email"}
          </button>
        </form>
      </section>

      {/* Password */}
      <section className="card mt-6 p-6">
        <h2 className="font-display text-2xl text-green-800">Password</h2>
        <form onSubmit={cambiaPassword} className="mt-4 space-y-3">
          <label className="block">
            <span className="label">Nuova password</span>
            <input
              type="password"
              className="field mt-1"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="Almeno 8 caratteri"
              autoComplete="new-password"
            />
          </label>
          <label className="block">
            <span className="label">Ripeti la nuova password</span>
            <input
              type="password"
              className="field mt-1"
              value={pwd2}
              onChange={(e) => setPwd2(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          {pwdMsg && <p className="text-sm font-semibold text-green-800">{pwdMsg}</p>}
          <button className="btn-lime" disabled={pwdBusy || !pwd || !pwd2}>
            {pwdBusy ? "Salvo…" : "Cambia password"}
          </button>
        </form>
      </section>

      {/* Anagrafica impresa (dati fiscali, sempre modificabili) */}
      <section id="fatturazione" className="mt-6 scroll-mt-20">
        <h2 className="font-display text-2xl text-green-800">
          {isCliente ? "Sei un'azienda?" : "Anagrafica impresa"}
        </h2>
        <p className="mt-1 text-sm text-green-900/70">
          {isCliente ? (
            <>
              Se ordini o prenoti come <strong>azienda</strong>, inserisci anche questi dati
              (ragione sociale, P.IVA, SDI/PEC): serviranno all&apos;azienda venditrice per
              emetterti la <strong>fattura</strong>. Se sei un privato, puoi lasciarli vuoti.
            </>
          ) : (
            <>
              Dati fiscali per la fattura dell&apos;abbonamento (ragione sociale, P.IVA, SDI/PEC).
              Puoi correggerli quando vuoi.
            </>
          )}
        </p>
        <div className="mt-3">
          <DatiFatturazioneForm ownerId={user.id} />
        </div>
      </section>

      {/* Fatture ricevute (servizio in attivazione) */}
      <section id="fatture-ricevute" className="card mt-6 p-6 scroll-mt-20">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-2xl text-green-800">Fatture ricevute</h2>
          <span className="rounded-full bg-badge-yellow/40 px-3 py-1 text-xs font-bold text-[#7a5b00]">
            Servizio in attivazione
          </span>
        </div>
        <p className="mt-3 rounded-xl bg-[#fffbe9] p-4 text-sm text-green-900/80">
          Presto troverai qui tutte le fatture dei tuoi abbonamenti e servizi, scaricabili in
          PDF: stiamo attivando la fatturazione automatica.
        </p>
      </section>

      {/* Notifiche */}
      <section id="notifiche" className="card mt-6 p-6 scroll-mt-20">
        <h2 className="font-display text-2xl text-green-800">Notifiche</h2>
        <p className="mt-1 text-sm text-green-900/70">
          Ricevi un avviso quando arriva un ordine, una prenotazione o un messaggio.
        </p>
        <div className="mt-3 space-y-3">
          <NotificheToggle />
          <SmsNotificheToggle ownerId={user.id} />
        </div>
      </section>

      {/* Geolocalizzazione & posizione */}
      <section id="geolocalizzazione" className="card mt-6 p-6 scroll-mt-20">
        <h2 className="font-display text-2xl text-green-800">Geolocalizzazione &amp; posizione</h2>
        <p className="mt-1 text-sm text-green-900/70">
          La posizione del tuo segnaposto sulla mappa si gestisce dalla scheda azienda
          (città, indirizzo e pin esatto).
        </p>
        <Link href="/dashboard?p=dati" className="btn-ghost mt-3 inline-flex text-sm">
          📍 Modifica posizione e dati aziendali →
        </Link>
      </section>

      {/* Termini & privacy */}
      <section id="privacy" className="card mt-6 p-6 scroll-mt-20">
        <h2 className="font-display text-2xl text-green-800">Termini &amp; privacy</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <a href={LEGALE.privacy} target="_blank" rel="noopener noreferrer" className="font-semibold text-green-700 hover:underline">
              Informativa privacy →
            </a>
          </li>
          <li>
            <a href={LEGALE.terminiVendita} target="_blank" rel="noopener noreferrer" className="font-semibold text-green-700 hover:underline">
              Termini di vendita →
            </a>
          </li>
          <li>
            <a href={LEGALE.condizioniVenditori} target="_blank" rel="noopener noreferrer" className="font-semibold text-green-700 hover:underline">
              Condizioni per i venditori →
            </a>
          </li>
        </ul>
      </section>

      {/* Elimina account */}
      <section id="elimina" className="card mt-6 border-2 border-traffic-red/30 p-6 scroll-mt-20">
        <h2 className="font-display text-2xl text-traffic-red">Elimina account</h2>
        <p className="mt-1 text-sm text-green-900/70">
          Cancella definitivamente il tuo profilo. È un&apos;azione <strong>irreversibile</strong>.
        </p>
        <button
          type="button"
          onClick={() => {
            setDelErr(null);
            setDelStep(1);
          }}
          className="mt-3 rounded-xl border-2 border-traffic-red px-4 py-2 text-sm font-bold text-traffic-red hover:bg-red-50"
        >
          🗑️ Elimina il mio account
        </button>
      </section>

      {/* Doppia conferma cancellazione */}
      {delStep > 0 && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            {delStep === 1 ? (
              <>
                <h3 className="font-display text-2xl text-traffic-red">Attenzione: stai per cancellare il profilo</h3>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-green-900/85">
                  <li>Tutti i tuoi <strong>dati saranno persi</strong> (scheda, prodotti, ordini, messaggi).</li>
                  <li>È una <strong>decisione irreversibile</strong>: non si può annullare.</li>
                  <li>Perderai gli <strong>abbonamenti</strong> e i <strong>servizi extra acquistati</strong>, senza rimborso.</li>
                  <li>Lo stesso account vale su ECO-VISA e BioFido: sparisce da entrambi.</li>
                </ul>
                <div className="mt-5 flex justify-end gap-3">
                  <button onClick={() => setDelStep(0)} className="btn-ghost text-sm">
                    Annulla
                  </button>
                  <button
                    onClick={() => setDelStep(2)}
                    className="rounded-xl bg-traffic-red px-4 py-2 text-sm font-bold text-white hover:opacity-90"
                  >
                    Accetto, continua
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-display text-2xl text-traffic-red">Ultima conferma</h3>
                <p className="mt-2 text-sm text-green-900/85">
                  Premendo il tasto qui sotto il tuo profilo <strong>smetterà di esistere</strong>.
                  Dati, abbonamenti e servizi extra andranno persi per sempre.
                </p>
                {delErr && <p className="mt-3 text-sm font-semibold text-traffic-red">{delErr}</p>}
                <button
                  onClick={confermaEliminazione}
                  disabled={delBusy}
                  className="mt-5 w-full rounded-xl bg-traffic-red px-4 py-4 text-center font-bold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {delBusy ? "Eliminazione in corso…" : "⚠️ Cancella il tuo profilo definitivamente"}
                </button>
                <button onClick={() => setDelStep(0)} className="btn-ghost mt-3 w-full justify-center text-sm">
                  No, torna indietro
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
