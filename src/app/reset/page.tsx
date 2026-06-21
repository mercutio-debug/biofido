"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/**
 * Pagina di reset password. L'utente ci arriva dal link ricevuto via email
 * (Supabase crea una sessione temporanea di "recovery"): qui imposta la nuova
 * password e poi entra normalmente.
 */
export default function ResetPage() {
  const router = useRouter();
  const [pronto, setPronto] = useState(false);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    // sessione già presente?
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setPronto(true);
    });
    // Supabase rileva il token di recovery nell'URL e crea la sessione
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setPronto(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function salva(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password.length < 8) {
      setErr("La password deve avere almeno 8 caratteri.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setOk(true);
    setTimeout(() => router.push("/dashboard"), 1400);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="title-pangea text-4xl text-green-700">Nuova password</h1>

      {!pronto ? (
        <p className="mt-4 rounded-lg bg-leaf p-4 text-sm font-semibold text-green-800">
          Apri questa pagina dal <strong>link ricevuto via email</strong>. Se l&apos;hai
          già aperto e non vedi il modulo, richiedi di nuovo il recupero dalla pagina di
          accesso.
        </p>
      ) : ok ? (
        <p className="mt-4 rounded-lg bg-leaf p-4 text-sm font-semibold text-green-700">
          Password aggiornata ✓ Ti porto nella tua area…
        </p>
      ) : (
        <form onSubmit={salva} className="card mt-6 space-y-4 p-6">
          <p className="text-sm text-green-900/70">
            Imposta una nuova password per il tuo account (vale su ECO-VISA e BioFido).
          </p>
          <label className="block">
            <span className="label">Nuova password</span>
            <input
              type="password"
              className="field mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Almeno 8 caratteri"
              required
            />
          </label>
          {err && <p className="text-sm font-semibold text-traffic-red">{err}</p>}
          <button className="btn-lime w-full" disabled={saving}>
            {saving ? "Salvo…" : "Imposta password ed entra"}
          </button>
        </form>
      )}
    </div>
  );
}
