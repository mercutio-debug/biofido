"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { Product } from "@/lib/biofido-data";
import { calcolaImpronta, SEMAFORO } from "@/lib/impronta";

/**
 * Scheda prodotto "aperta" (BioFido): foto grandi (prodotto + etichetta),
 * descrizione completa, confezione/contenuto/durata, semaforo, prezzo e i tasti
 * prenota/carrello. Si apre cliccando un prodotto nella scheda azienda.
 */
export function ProdottoDettaglioBio({
  p,
  gold,
  canSell,
  sede,
  onClose,
  onPrenota,
  onCarrello,
}: {
  p: Product;
  gold: boolean;
  canSell: boolean;
  sede: { lat: number; lon: number };
  onClose: () => void;
  onPrenota?: () => void;
  onCarrello?: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const volume = p.contenuto != null ? `${p.contenuto} ${p.unita ?? ""}`.trim() : null;
  const esaurito = p.in_shop && p.giacenza === 0;
  const imp =
    p.mostraSemaforo !== false && (p.ingredients?.length ?? 0) > 0
      ? calcolaImpronta(sede, p.ingredients ?? [])
      : null;

  const contenuto = (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="card max-h-[88dvh] w-full max-w-2xl overflow-y-auto overscroll-contain p-0 sm:max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* galleria foto (solo Gold) */}
        {gold && (p.image || p.foto2) && (
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {p.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image} alt={p.name} className="h-64 w-full object-cover sm:rounded-tl-2xl" />
            )}
            {p.foto2 && (
              <figure className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.foto2} alt={`${p.name} — etichetta`} className="h-64 w-full object-cover sm:rounded-tr-2xl" />
                <figcaption className="absolute bottom-0 left-0 right-0 bg-black/45 py-1 text-center text-xs font-semibold text-white">
                  Etichetta
                </figcaption>
              </figure>
            )}
          </div>
        )}

        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {p.category && (
                <div className="text-xs font-bold uppercase tracking-wide text-lime-500">{p.category}</div>
              )}
              <h3 className="font-display text-2xl text-green-800">{p.name}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Chiudi"
              className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-leaf text-green-800 hover:bg-leaf/70"
            >
              ✕
            </button>
          </div>

          {gold && p.price && (
            <div className="mt-2 text-2xl font-bold text-green-800">
              {p.price}
              {p.unit ? <span className="text-sm font-normal text-green-900/55"> {p.unit}</span> : null}
            </div>
          )}

          {imp && (
            <div className="mt-2">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold"
                style={{ backgroundColor: `${SEMAFORO[imp.level].colore}22`, color: SEMAFORO[imp.level].colore }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: SEMAFORO[imp.level].colore }} />
                Semaforo: {SEMAFORO[imp.level].label}
              </span>
              {imp.tiers.length > 0 && (
                <div className="mt-2">
                  <div className="flex flex-wrap items-center gap-1">
                    {imp.tiers.map((t, i) => (
                      <span
                        key={i}
                        title={SEMAFORO[t].label}
                        className="h-3.5 w-3.5 rounded-full"
                        style={{ background: SEMAFORO[t].colore, boxShadow: `0 0 5px ${SEMAFORO[t].colore}` }}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] text-green-900/60">
                    Giudizio <strong>qualitativo della composizione</strong> (ogni materia
                    prima ha il suo colore, sopra), non una somma di CO₂ — vedi la legenda
                    sotto la mappa.
                  </p>
                </div>
              )}
              {imp.consigli.length > 0 && (
                <div className="mt-2 space-y-2">
                  {imp.consigli.map((c, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-xl border border-lime-500/40 bg-leaf/40 p-2">
                      <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-lime-500 text-sm font-bold text-white">💡</span>
                      <p className="text-xs text-green-900/80">{c}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {(p.confezione || volume) && (
            <p className="mt-2 text-sm font-semibold text-green-900/75">
              {[p.confezione, volume].filter(Boolean).join(" · ")}
            </p>
          )}
          {p.durata && (
            <p className="mt-1 text-sm font-semibold text-green-900/75">⏱ Durata: {p.durata}</p>
          )}

          {p.description ? (
            <p className="mt-3 whitespace-pre-line text-green-900/80">{p.description}</p>
          ) : (
            <p className="mt-3 text-sm text-green-900/45">Nessuna descrizione disponibile.</p>
          )}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            {canSell && p.prenotabile && onPrenota && (
              <button type="button" onClick={onPrenota} className="btn-lime flex-1 justify-center text-sm">
                ✨ Prenota / richiedi
              </button>
            )}
            {gold && p.in_shop &&
              (esaurito ? (
                <div className="flex-1 rounded-lg bg-[#f3dada] py-2 text-center text-sm font-bold text-traffic-red">
                  Esaurito
                </div>
              ) : (
                onCarrello && (
                  <button type="button" onClick={onCarrello} className="btn-lime flex-1 justify-center text-sm">
                    🛒 Aggiungi al carrello
                  </button>
                )
              ))}
          </div>
          {gold && p.in_shop && !esaurito && typeof p.giacenza === "number" && (
            <div className="mt-2 text-xs font-semibold text-green-900/60">Disponibili: {p.giacenza}</div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(contenuto, document.body) : null;
}
