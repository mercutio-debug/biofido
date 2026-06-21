"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import { DatiFatturazioneForm } from "@/components/DatiFatturazioneForm";

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

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="title-pangea text-4xl text-green-700">Il mio account</h1>
      <p className="mt-2 text-green-900/70">
        Aggiorna l&apos;email di accesso, la password e i dati di fatturazione. Lo stesso
        account vale su ECO-VISA e BioFido.
      </p>

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

      {/* Dati di fatturazione (sempre modificabili) */}
      <section className="mt-6">
        <h2 className="font-display text-2xl text-green-800">Dati di fatturazione</h2>
        <p className="mt-1 text-sm text-green-900/70">
          Servono per la fattura dell&apos;abbonamento. Puoi correggerli quando vuoi.
        </p>
        <div className="mt-3">
          <DatiFatturazioneForm ownerId={user.id} />
        </div>
      </section>
    </div>
  );
}
