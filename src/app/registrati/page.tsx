"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Turnstile, turnstileAttivo } from "@/components/Turnstile";

// base path del portale (vuoto su ecovisa.it, "/biofido" su GitHub Pages):
// serve per far tornare il link di conferma email sulla pagina di benvenuto.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function RegistratiPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password.length < 6) {
      setError("La password deve avere almeno 6 caratteri.");
      return;
    }
    if (turnstileAttivo && !captcha) {
      setError("Conferma di non essere un robot.");
      return;
    }
    setLoading(true);
    // Crea l'account con sole email + password. Il nome dell'azienda si
    // inserisce dopo il login, nella scheda della dashboard.
    const { data, error: signErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        captchaToken: captcha ?? undefined,
        // dopo il click sul link di conferma si torna sulla pagina di benvenuto
        // del portale (non più su localhost).
        emailRedirectTo: `${window.location.origin}${BASE}/benvenuto/`,
      },
    });
    setLoading(false);
    if (signErr) {
      setError(
        /already registered/i.test(signErr.message)
          ? "Utente già registrato. Accedi con le tue credenziali."
          : signErr.message,
      );
      // il token Turnstile è monouso: ne serve uno nuovo dopo un errore
      setCaptcha(null);
      setCaptchaKey((k) => k + 1);
      return;
    }
    // email già presente: Supabase risponde con un utente SENZA identità (anti-enumerazione)
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setInfo(null);
      setError(
        "Utente già registrato. Lo stesso account vale su BioFido ed ECO-VISA: accedi con le tue credenziali.",
      );
      setCaptcha(null);
      setCaptchaKey((k) => k + 1);
      return;
    }
    if (data.session) {
      // conferma email disattivata: si entra subito
      router.push("/dashboard");
    } else {
      // conferma email attiva: bisogna confermare prima di accedere
      setInfo(
        "Account creato! Ti abbiamo inviato un'email di conferma a " +
          email +
          ". Conferma l'indirizzo, poi accedi."
      );
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="text-xs font-bold uppercase tracking-wide text-lime-500">
        Area aziende
      </div>
      <h1 className="title-pangea mt-2 text-4xl text-green-700">
        Iscrivi la tua azienda
      </h1>
      <p className="mt-3 text-green-900/80">
        Ti bastano email e password. Il nome dell&apos;azienda e gli altri dati
        li inserisci dopo, dalla tua dashboard.
      </p>

      <form onSubmit={handleSubmit} className="card mt-8 space-y-4 p-6">
        <label className="block">
          <span className="label">Email (sarà il tuo username)</span>
          <input
            type="email"
            className="field mt-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="azienda@esempio.it"
            required
          />
        </label>
        <label className="block">
          <span className="label">Password</span>
          <input
            type="password"
            className="field mt-1"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Almeno 6 caratteri"
            required
          />
        </label>

        {error && <p className="text-sm font-semibold text-traffic-red">{error}</p>}
        {info && (
          <p className="rounded-lg bg-leaf p-3 text-sm font-semibold text-green-700">
            {info}
          </p>
        )}

        <Turnstile key={captchaKey} onToken={setCaptcha} />

        <button
          type="submit"
          className="btn-lime w-full"
          disabled={loading || (turnstileAttivo && !captcha)}
        >
          {loading ? "Creazione in corso…" : "Crea account"}
        </button>
        <p className="text-center text-sm text-green-900/70">
          Hai già un account?{" "}
          <Link href="/accedi" className="font-bold text-green-700 hover:text-lime-500">
            Accedi
          </Link>
        </p>
      </form>
    </div>
  );
}
