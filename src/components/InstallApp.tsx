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
  const [hint, setHint] = useState<string | null>(null);

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
    setHint(
      "Per installarla apri il menù del browser (⋮ o Condividi) e tocca “Aggiungi a schermata Home”.",
    );
  }

  if (installed) return null;

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
      {hint && <p className="mt-1 max-w-xs text-xs text-green-900/70">{hint}</p>}
    </div>
  );
}
