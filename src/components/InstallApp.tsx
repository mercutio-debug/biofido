"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Installa l'app: NON un pulsante, ma semplicemente l'icona dell'app (in una
 * cornice bianca per staccarla dallo sfondo). Al clic avvia l'installazione
 * della PWA (evento `beforeinstallprompt`); su iPhone mostra le istruzioni.
 * Si nasconde se l'app è già installata.
 */
type BIPEvent = Event & { prompt: () => void; userChoice: Promise<unknown> };

export function InstallApp() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [hint, setHint] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (window.matchMedia?.("(display-mode: standalone)").matches) {
      setInstalled(true);
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function handleClick() {
    if (deferred) {
      deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      return;
    }
    // Nessun prompt automatico disponibile (iPhone, o Chrome non l'ha armato /
    // app già installata): mostro le istruzioni manuali, sempre valide.
    setHint(true);
  }

  if (installed) return null;

  const isIOS =
    typeof navigator !== "undefined" && /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={handleClick}
        aria-label="Installa l'app BioFido sul tuo smartphone"
        className="inline-block rounded-2xl border border-[#e3eed7] bg-white p-2 shadow-sm transition hover:shadow-md active:scale-[0.98]"
      >
        <Image
          src={`${BASE}/brand/icon-192.png`}
          alt="Installa l'app BioFido"
          width={96}
          height={96}
          className="rounded-xl"
        />
      </button>
      <p className="mt-1.5 text-xs text-green-900/60">Tocca l&apos;icona per installare l&apos;app</p>

      {hint && (
        <div className="mt-2 max-w-xs rounded-xl border border-[#e3eed7] bg-white p-3 text-sm text-green-900/85 shadow-sm">
          {isIOS ? (
            <>
              <p className="font-semibold text-green-800">Su iPhone (Safari):</p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-5">
                <li>Tocca <strong>Condividi</strong> ⬆️ (in basso).</li>
                <li>Scorri e tocca <strong>«Aggiungi a Home»</strong>.</li>
              </ol>
            </>
          ) : (
            <>
              <p className="font-semibold text-green-800">Su Android (Chrome):</p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-5">
                <li>Apri il menu <strong>⋮</strong> in alto a destra del browser.</li>
                <li>Tocca <strong>«Installa app»</strong> (o «Aggiungi a schermata Home»).</li>
              </ol>
              <p className="mt-1 text-xs text-green-900/55">
                Se non vedi «Installa app», l&apos;app è già installata: aprila dall&apos;icona
                sulla schermata Home.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
