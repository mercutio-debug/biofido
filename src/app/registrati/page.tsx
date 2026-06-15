"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RegistratiPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password.length < 6) {
      setError("La password deve avere almeno 6 caratteri.");
      return;
    }
    setLoading(true);
    // Crea l'account. Il nome azienda viene salvato nei metadati e poi usato
    // per precompilare la scheda anagrafica nella dashboard.
    const { data, error: signErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome } },
    });
    setLoading(false);
    if (signErr) {
      setError(signErr.message);
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
        Crea un account per caricare i tuoi prodotti e vedere la loro impronta
        ecologica.
      </p>

      <form onSubmit={handleSubmit} className="card mt-8 space-y-4 p-6">
        <label className="block">
          <span className="label">Nome azienda</span>
          <input
            className="field mt-1"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Es. Dolciaria Zia Pina S.r.l."
            required
          />
        </label>
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

        <button type="submit" className="btn-lime w-full" disabled={loading}>
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
