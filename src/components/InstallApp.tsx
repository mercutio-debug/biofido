"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Pulsante "Scarica l'app sul tuo smartphone".
 * Mostra l'icona di BioFido + il testo e, al clic, avvia l'installazione della
 * PWA (evento `beforeinstallprompt`). Così l'utente può installarla in
 * qualunque momento, anche se ha chiuso il popup iniziale.
 * Se il browser non espone il prompt (es. iPhone) mostra le istruzioni manuali.
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
      "Per installarla apri il menù del browser (⋮ o Condividi) e tocca “Aggiungi a schermata Home”."
    );
  }

  if (installed) return null;

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={handleClick}
        className="btn-lime"
        aria-label="Scarica l'app BioFido sul tuo smartphone"
      >
        <Image
          src={`${BASE}/brand/icon-192.png`}
          alt=""
          width={26}
          height={26}
          className="rounded-md"
        />
        Scarica l&apos;app sul tuo smartphone
      </button>
      {hint && <p className="mt-2 max-w-xs text-xs text-green-900/70">{hint}</p>}
    </div>
  );
}
