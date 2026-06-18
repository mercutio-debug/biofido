"use client";

import { useEffect, useState } from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Evento Chrome non ancora tipizzato in TS standard. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Cornice «Scarica l'app» con l'icona di BioFido. Su Android/Chrome, toccandola
 * parte il dialogo nativo di installazione (l'app finisce sulla schermata Home
 * con la sua icona). Su iPhone (Safari non espone l'evento) mostra le istruzioni
 * «Condividi → Aggiungi a Home». Si nasconde se l'app è già installata.
 */
export function InstallApp({ className = "" }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [aiuto, setAiuto] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) setInstalled(true);

    setIsIOS(/iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase()));

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
      <button
        type="button"
        onClick={installa}
        aria-label="Scarica l'app BioFido"
        className="group flex w-full max-w-sm items-center gap-4 rounded-2xl border-2 border-[var(--lime-500)] bg-leaf/40 p-3 text-left transition hover:bg-leaf/70 active:scale-[0.99]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${BASE}/brand/icon-192.png`}
          alt="Icona BioFido"
          width={64}
          height={64}
          className="h-16 w-16 flex-none rounded-2xl shadow-sm"
        />
        <div className="min-w-0">
          <div className="font-display text-xl leading-tight text-green-800">Scarica l&apos;app</div>
          <div className="text-sm text-green-900/70">
            Installa BioFido sul telefono — gratis, si apre come un&apos;app.
          </div>
        </div>
        <span className="ml-auto flex-none text-2xl text-green-700/70 transition group-hover:translate-x-0.5">
          ⤓
        </span>
      </button>

      {aiuto && (
        <div className="mt-3 max-w-sm rounded-2xl border border-[#e3eed7] bg-white p-4 text-sm text-green-900/85 shadow-sm">
          {isIOS ? (
            <>
              <p className="font-semibold text-green-800">Su iPhone/iPad (Safari):</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5">
                <li>
                  Tocca il pulsante <strong>Condividi</strong> in basso (il quadrato con
                  la freccia ⬆️).
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
