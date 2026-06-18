"use client";

import { useEffect, useState } from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const DISMISS_KEY = "biofido_install_dismissed";

/** Evento Chrome non ancora tipizzato in TS standard. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Popup «Installa l'app BioFido». Compare da solo quando il telefono può
 * installare la PWA: su Android/Chrome il tasto «Installa» avvia il download
 * nativo (l'app va sulla Home e si apre a schermo intero, senza browser); su
 * iPhone mostra le istruzioni «Condividi → Aggiungi a Home». Non ricompare se
 * l'utente lo chiude o se l'app è già installata.
 */
export function InstallPopup() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return; // già installata/aperta come app
    if (localStorage.getItem(DISMISS_KEY)) return; // già chiuso dall'utente

    const ios = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    setIsIOS(ios);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setOpen(true);
    };
    const onInstalled = () => {
      setOpen(false);
      setDeferred(null);
      try {
        localStorage.setItem(DISMISS_KEY, "1");
      } catch {}
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // iOS non emette beforeinstallprompt: mostro comunque il popup con le istruzioni
    let t: number | undefined;
    if (ios) t = window.setTimeout(() => setOpen(true), 1200);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if (t) window.clearTimeout(t);
    };
  }, []);

  if (!open) return null;

  function chiudi() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setOpen(false);
  }

  async function installa() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  }

  return (
    <div
      className="fixed inset-0 z-[4000] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Installa l'app BioFido"
      onClick={chiudi}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${BASE}/brand/icon-192.png`}
            alt="Icona BioFido"
            width={72}
            height={72}
            className="h-18 w-18 flex-none rounded-2xl shadow-sm"
            style={{ height: 72, width: 72 }}
          />
          <div>
            <h2 className="font-display text-2xl leading-tight text-green-800">
              Installa l&apos;app BioFido
            </h2>
            <p className="mt-0.5 text-sm text-green-900/70">
              Si apre come un&apos;app, a schermo intero — gratis, niente browser.
            </p>
          </div>
        </div>

        {isIOS && !deferred ? (
          <div className="mt-4 rounded-2xl bg-leaf/40 p-4 text-sm text-green-900/85">
            <p className="font-semibold text-green-800">Su iPhone/iPad (Safari):</p>
            <ol className="mt-1 list-decimal space-y-1 pl-5">
              <li>
                Tocca <strong>Condividi</strong> in basso (il quadrato con la freccia ⬆️).
              </li>
              <li>
                Scorri e tocca <strong>«Aggiungi a Home»</strong>.
              </li>
            </ol>
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={chiudi}
            className="text-sm font-semibold text-green-900/60 hover:text-green-900"
          >
            Non ora
          </button>
          {deferred && (
            <button type="button" onClick={installa} className="btn-lime">
              📲 Installa
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
