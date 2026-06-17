"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, ADMIN_EMAIL } from "@/lib/supabase";
import { Turnstile, turnstileAttivo } from "@/components/Turnstile";

export default function AccediPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (turnstileAttivo && !captcha) {
      setError("Conferma di non essere un robot.");
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken: captcha ?? undefined },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      setCaptcha(null);
      setCaptchaKey((k) => k + 1);
      return;
    }
    const isAdmin =
      data.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    router.push(isAdmin ? "/admin" : "/dashboard");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="text-xs font-bold uppercase tracking-wide text-lime-500">
        Area aziende
      </div>
      <h1 className="title-pangea mt-2 text-4xl text-green-700">Accedi</h1>
      <p className="mt-3 text-green-900/80">
        Entra nella tua area per gestire azienda e prodotti.
      </p>

      <form onSubmit={handleSubmit} className="card mt-8 space-y-4 p-6">
        <label className="block">
          <span className="label">Email</span>
          <input
            type="email"
            className="field mt-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            required
          />
        </label>

        {error && <p className="text-sm font-semibold text-traffic-red">{error}</p>}

        <Turnstile key={captchaKey} onToken={setCaptcha} />

        <button
          type="submit"
          className="btn-lime w-full"
          disabled={loading || (turnstileAttivo && !captcha)}
        >
          {loading ? "Accesso…" : "Accedi"}
        </button>
        <p className="text-center text-sm text-green-900/70">
          Non hai un account?{" "}
          <Link href="/registrati" className="font-bold text-green-700 hover:text-lime-500">
            Iscrivi la tua azienda
          </Link>
        </p>
      </form>
    </div>
  );
}
