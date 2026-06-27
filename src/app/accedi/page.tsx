"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, ADMIN_EMAIL } from "@/lib/supabase";
import { Turnstile, turnstileAttivo } from "@/components/Turnstile";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function AccediPage() {
  const router = useRouter();

  // Se sei GIÀ loggato (es. torni indietro col tasto del browser dalla dashboard),
  // non rimostrare il login: rientra subito nell'area corretta. Evita il finto
  // "logout" che costringeva a riaccedere.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (!u) return;
      const isAdmin = u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      const tipo = (u.user_metadata as { tipo?: string } | undefined)?.tipo;
      if (isAdmin) router.replace("/admin");
      else if (tipo === "cliente") router.replace("/");
      else router.replace("/dashboard");
    });
  }, [router]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [falliti, setFalliti] = useState(0);

  // recupero password
  const [recupero, setRecupero] = useState(false);
  const [recMail, setRecMail] = useState("");
  const [recMsg, setRecMsg] = useState<string | null>(null);
  const [recBusy, setRecBusy] = useState(false);

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
      const msg = /invalid login credentials/i.test(err.message)
        ? "Email o password non corretti."
        : err.message;
      setError(msg);
      setFalliti((n) => n + 1);
      setCaptcha(null);
      setCaptchaKey((k) => k + 1);
      return;
    }
    const isAdmin = data.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const tipo = (data.user?.user_metadata as { tipo?: string } | undefined)?.tipo;
    let dest = "";
    try {
      dest = sessionStorage.getItem("postLoginRedirect") ?? "";
      if (dest) sessionStorage.removeItem("postLoginRedirect");
    } catch {
      /* ignore */
    }
    if (dest) router.push(dest);
    else if (isAdmin) router.push("/admin");
    else if (tipo === "cliente") router.push("/"); // i clienti NON vanno nell'area aziende
    else router.push("/dashboard");
  }

  async function inviaRecupero(e: React.FormEvent) {
    e.preventDefault();
    setRecMsg(null);
    if (!recMail.trim()) return;
    setRecBusy(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(recMail, {
      redirectTo: `${window.location.origin}${BASE}/reset/`,
    });
    setRecBusy(false);
    setRecMsg(
      err
        ? err.message
        : "Se l'indirizzo è registrato, ti è arrivata un'email con le istruzioni per accedere e impostare una nuova password.",
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="text-xs font-bold uppercase tracking-wide text-lime-500">
        Il tuo account
      </div>
      <h1 className="title-pangea mt-2 text-4xl text-green-700">Accedi</h1>
      <p className="mt-3 text-green-900/80">
        Attività e clienti, stesso accesso. Stesse credenziali su BioFido ed
        ECO-VISA: un solo account per entrambi.
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

        <button
          type="button"
          onClick={() => {
            setRecupero((v) => !v);
            setRecMail(email);
            setRecMsg(null);
          }}
          className={`block w-full text-center text-sm font-semibold ${
            falliti > 0 ? "text-traffic-red" : "text-green-700"
          } hover:underline`}
        >
          Password o user dimenticati? — Recupera dati
        </button>

        <p className="text-center text-sm text-green-900/70">
          Non hai un account?{" "}
          <Link href="/registrati?tipo=cliente" className="font-bold text-green-700 hover:text-lime-500">
            Iscriviti come cliente
          </Link>{" "}
          ·{" "}
          <Link href="/registrati" className="font-bold text-green-700 hover:text-lime-500">
            come attività
          </Link>
        </p>
      </form>

      {recupero && (
        <div className="card mt-4 space-y-3 p-6">
          <h2 className="font-display text-xl text-green-800">Recupera l&apos;accesso</h2>
          <p className="text-sm text-green-900/70">
            Inserisci la mail con cui ti sei iscritto: ti invieremo un&apos;email con un
            link per accedere e impostare una nuova password.
          </p>
          <form onSubmit={inviaRecupero} className="flex gap-2">
            <input
              type="email"
              className="field flex-1"
              value={recMail}
              onChange={(e) => setRecMail(e.target.value)}
              placeholder="latua@email.it"
              required
            />
            <button className="btn-lime whitespace-nowrap" disabled={recBusy}>
              {recBusy ? "Invio…" : "Invia"}
            </button>
          </form>
          {recMsg && (
            <p className="rounded-lg bg-leaf p-3 text-sm font-semibold text-green-700">
              {recMsg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
