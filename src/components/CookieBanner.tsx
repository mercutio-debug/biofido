"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Banner informativo sui cookie. Il sito usa SOLO cookie tecnici (sessione di
 * accesso, preferenze, questo consenso): per legge basta l'informativa, non
 * serve l'opt-in dei cookie di profilazione (che non usiamo). Il consenso è
 * memorizzato in localStorage, così il banner compare una sola volta.
 */
const KEY = "cookie_consent_v1";

export function CookieBanner() {
  const [mostra, setMostra] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(KEY)) setMostra(true);
  }, []);

  function accetta() {
    localStorage.setItem(KEY, "1");
    setMostra(false);
  }

  if (!mostra) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[2400] p-3 print:hidden">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 rounded-2xl border border-[#e3eed7] bg-white p-4 shadow-lg sm:flex-row">
        <p className="flex-1 text-sm text-green-900/85">
          Usiamo solo <strong>cookie tecnici</strong> necessari al funzionamento del
          sito (accesso, preferenze, consenso). Nessun cookie di profilazione
          pubblicitaria.{" "}
          <Link href="/privacy" className="font-semibold text-green-700 underline">
            Maggiori informazioni
          </Link>
          .
        </p>
        <button onClick={accetta} className="btn-lime whitespace-nowrap">
          Ho capito
        </button>
      </div>
    </div>
  );
}
