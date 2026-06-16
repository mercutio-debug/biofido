"use client";

import { useEffect, useState } from "react";

/**
 * Pannello di accessibilità per ipovedenti: ingrandimento del testo e modalità
 * ad alto contrasto. Le preferenze sono salvate e riapplicate ad ogni visita.
 * Ingrandire il testo agisce sulla dimensione base (rem) di tutta la pagina.
 */
const SIZES = ["100%", "112%", "125%", "137%", "150%"];

function applica(livello: number, contrasto: boolean) {
  document.documentElement.style.fontSize = SIZES[livello] ?? "100%";
  document.documentElement.classList.toggle("hc", contrasto);
}

export function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [livello, setLivello] = useState(0);
  const [contrasto, setContrasto] = useState(false);

  // carica le preferenze salvate
  useEffect(() => {
    const l = Number(localStorage.getItem("a11y_livello") ?? "0");
    setLivello(Number.isFinite(l) ? Math.max(0, Math.min(SIZES.length - 1, l)) : 0);
    setContrasto(localStorage.getItem("a11y_hc") === "1");
  }, []);

  // applica al DOM ogni volta che cambiano (niente stale-closure)
  useEffect(() => {
    applica(livello, contrasto);
  }, [livello, contrasto]);

  function cambiaTesto(delta: number) {
    setLivello((prev) => {
      const v = Math.max(0, Math.min(SIZES.length - 1, prev + delta));
      localStorage.setItem("a11y_livello", String(v));
      return v;
    });
  }
  function toggleContrasto() {
    setContrasto((prev) => {
      const v = !prev;
      localStorage.setItem("a11y_hc", v ? "1" : "0");
      return v;
    });
  }
  function ripristina() {
    localStorage.removeItem("a11y_livello");
    localStorage.removeItem("a11y_hc");
    setLivello(0);
    setContrasto(false);
  }

  return (
    <div className="fixed bottom-4 left-4 z-[2500] print:hidden">
      {open && (
        <div
          role="dialog"
          aria-label="Opzioni di accessibilità"
          className="card mb-3 w-64 p-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-green-800">Accessibilità</h2>
            <button
              onClick={() => setOpen(false)}
              aria-label="Chiudi"
              className="text-xl leading-none text-green-900/50 hover:text-green-900"
            >
              ×
            </button>
          </div>

          <div className="mt-3">
            <span className="label">Dimensione testo</span>
            <div className="mt-1 flex items-center gap-2">
              <button
                onClick={() => cambiaTesto(-1)}
                disabled={livello === 0}
                aria-label="Riduci il testo"
                className="btn-ghost h-10 w-10 justify-center p-0 text-base disabled:opacity-40"
              >
                A−
              </button>
              <div
                className="flex-1 text-center text-sm font-bold text-green-800"
                aria-live="polite"
              >
                {parseInt(SIZES[livello])}%
              </div>
              <button
                onClick={() => cambiaTesto(1)}
                disabled={livello === SIZES.length - 1}
                aria-label="Ingrandisci il testo"
                className="btn-lime h-10 w-10 justify-center p-0 text-lg disabled:opacity-40"
              >
                A+
              </button>
            </div>
          </div>

          <button
            onClick={toggleContrasto}
            aria-pressed={contrasto}
            className={`mt-4 w-full justify-center ${contrasto ? "btn-lime" : "btn-ghost"}`}
          >
            {contrasto ? "✓ Alto contrasto attivo" : "Attiva alto contrasto"}
          </button>

          <button
            onClick={ripristina}
            className="mt-2 w-full text-xs font-semibold text-green-700 hover:underline"
          >
            Ripristina predefiniti
          </button>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Opzioni di accessibilità"
        aria-expanded={open}
        className="btn-lime h-12 w-12 justify-center p-0 text-xl shadow-lg"
        title="Accessibilità"
      >
        ♿
      </button>
    </div>
  );
}
