"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SERVIZI_EXTRA } from "@/lib/servizi-extra";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Con quale abbonamento si sblocca ciascun servizio. */
const REQ: Record<string, string> = {
  onboarding: "Servizio extra acquistabile solo con l'abbonamento Gold",
  report: "Servizio acquistabile con l'abbonamento Silver",
  badge: "Servizio acquistabile con l'abbonamento Silver",
};

/**
 * Vetrina dei "servizi extra" (onboarding, report, badge). Ogni card ha un tasto
 * "Guarda la demo" che apre la presentazione (statica in /demo/<key>/) in un
 * overlay DENTRO l'app, con una ✕ per chiuderla (così dall'app non si è
 * costretti al tasto «indietro», che uscirebbe dall'app).
 * Usata sia nella pagina pubblica /servizi-extra sia nella dashboard.
 */
export function ServiziExtra({ showPrices = false }: { showPrices?: boolean }) {
  const [demo, setDemo] = useState<{ key: string; nome: string } | null>(null);

  // chiusura con Esc + messaggio dalla ✕ interna al deck (iframe)
  useEffect(() => {
    if (!demo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDemo(null);
    };
    const onMsg = (e: MessageEvent) => {
      if (e.data === "biofido-close-demo") setDemo(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("message", onMsg);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("message", onMsg);
    };
  }, [demo]);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {SERVIZI_EXTRA.map((s) => (
          <div key={s.key} className="card flex flex-col p-5">
            <div className="text-2xl">{s.emoji}</div>
            <h3 className="mt-1 font-display text-xl text-green-800">{s.nome}</h3>
            <p className="mt-2 flex-1 text-sm text-green-900/75">{s.desc}</p>
            {showPrices && (
              <div className="mt-3 font-semibold text-green-800">{s.prezzo}</div>
            )}
            <div className="mt-3 rounded-lg bg-leaf/60 px-3 py-1.5 text-center text-xs font-bold text-green-800">
              {REQ[s.key] ?? "Servizio extra"}
            </div>
            <button
              type="button"
              onClick={() => setDemo({ key: s.key, nome: s.nome })}
              className="btn-ghost mt-3 justify-center text-sm"
            >
              ▶ Guarda la demo
            </button>
            <Link
              href="/abbonamenti"
              className="btn-lime mt-2 justify-center text-sm"
            >
              🛒 Acquista {s.nome}
            </Link>
          </div>
        ))}
      </div>

      {demo && (
        <div
          className="fixed inset-0 z-[200] flex flex-col bg-black/80"
          role="dialog"
          aria-modal="true"
          aria-label={`Demo ${demo.nome}`}
        >
          <div className="flex items-center justify-between gap-3 bg-[#0e2417] px-4 py-2 text-white">
            <span className="truncate font-display text-sm">{demo.nome} — demo</span>
            <div className="flex items-center gap-2">
              <a
                href={`${BASE}/demo/${demo.key}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/40 px-3 py-1 text-xs font-bold hover:bg-white/10"
              >
                Schermo intero ↗
              </a>
              <button
                type="button"
                onClick={() => setDemo(null)}
                aria-label="Chiudi la demo"
                className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold hover:bg-white/25"
              >
                ✕ Chiudi
              </button>
            </div>
          </div>
          <iframe
            src={`${BASE}/demo/${demo.key}/`}
            title={`Demo ${demo.nome}`}
            className="min-h-0 w-full flex-1 bg-[#0e2417]"
          />
        </div>
      )}
    </>
  );
}
