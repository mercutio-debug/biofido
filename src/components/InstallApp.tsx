"use client";

import { useEffect, useState } from "react";

/** Evento Chrome non ancora tipizzato in TS standard. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Pulsante «Installa l'app». Su Android/Chrome usa l'evento nativo
 * beforeinstallprompt per mostrare il dialogo di installazione; su iOS (Safari
 * non espone quell'evento) mostra le istruzioni «Condividi → Aggiungi a Home».
 * Si nasconde se l'app è già installata (avviata in modalità standalone).
 */
export function InstallApp({ className = "" }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [aiuto, setAiuto] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // già installata? (PWA avviata a schermo intero)
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) setInstalled(true);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  async function installa() {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      return;
    }
    // niente prompt nativo (iOS, o Chrome non ancora pronto): mostro le istruzioni
    setAiuto((v) => !v);
  }

  return (
    <div className={className}>
      <button type="button" onClick={installa} className="btn-lime">
        📲 Installa l&apos;app
      </button>

      {aiuto && (
        <div className="mt-3 max-w-sm rounded-2xl border border-[#e3eed7] bg-white p-4 text-sm text-green-900/85 shadow-sm">
          {isIOS ? (
            <>
              <p className="font-semibold text-green-800">Su iPhone/iPad (Safari):</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5">
                <li>
                  Tocca il pulsante <strong>Condividi</strong> in basso (il quadrato
                  con la freccia ⬆️).
                </li>
                <li>
                  Scorri e tocca <strong>«Aggiungi a Home»</strong>.
                </li>
                <li>Conferma: BioFido comparirà come un&apos;app sulla schermata Home.</li>
              </ol>
            </>
          ) : (
            <>
              <p className="font-semibold text-green-800">Su Android (Chrome):</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5">
                <li>
                  Apri il menu <strong>⋮</strong> in alto a destra del browser.
                </li>
                <li>
                  Tocca <strong>«Installa app»</strong> (oppure «Aggiungi a schermata
                  Home»).
                </li>
                <li>Conferma: BioFido comparirà come un&apos;app.</li>
              </ol>
            </>
          )}
        </div>
      )}
    </div>
  );
}
