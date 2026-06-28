"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { euroCents, type Experience } from "@/lib/bookings";
import { LINGUE_SERVIZIO } from "@/lib/catalogo";

/**
 * Scheda esperienza "aperta": foto grande, descrizione completa, durata, max
 * persone, giorni, orario e lingue. Si apre cliccando un'esperienza nella scheda
 * azienda — stessa modalità dei prodotti.
 */
const GIORNI = ["", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

export function EsperienzaDettaglio({
  e,
  onClose,
  onPrenota,
}: {
  e: Experience;
  onClose: () => void;
  onPrenota?: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const lingueLabel = (e.lingue ?? [])
    .map((c) => {
      const l = LINGUE_SERVIZIO.find((x) => x.code === c);
      return l ? `${l.flag} ${l.label}` : c.toUpperCase();
    })
    .join(" · ");

  const contenuto = (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="card max-h-[88dvh] w-full max-w-2xl overflow-y-auto overscroll-contain p-0 sm:max-h-[92vh]"
        onClick={(ev) => ev.stopPropagation()}
      >
        {e.immagine && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.immagine} alt={e.titolo} className="h-64 w-full object-cover sm:rounded-t-2xl" />
        )}

        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase tracking-wide text-lime-500">
                Esperienza in azienda
              </div>
              <h3 className="font-display text-2xl text-green-800">{e.titolo}</h3>
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

          <div className="mt-2 text-2xl font-bold text-green-800">{euroCents(e.prezzoCents)}</div>

          {/* specifiche */}
          <div className="mt-3 space-y-1.5 rounded-2xl border border-[#e3eed7] bg-white p-4 text-sm text-green-900/85">
            <div>
              👥 <strong>Max {e.maxPersone}</strong> persone
              {e.durataMin ? <> · ⏱ Durata ~{e.durataMin} min</> : null}
            </div>
            <div>
              🗓{" "}
              {e.giorniSettimana?.length
                ? e.giorniSettimana.map((g) => GIORNI[g]).join(", ")
                : "Tutti i giorni (da concordare)"}
              {e.orario ? <> · 🕒 {e.orario}</> : null}
            </div>
            {lingueLabel && <div>🗣 {lingueLabel}</div>}
          </div>

          {e.descrizione ? (
            <p className="mt-3 whitespace-pre-line text-green-900/80">{e.descrizione}</p>
          ) : (
            <p className="mt-3 text-sm text-green-900/45">Nessuna descrizione disponibile.</p>
          )}

          {onPrenota && (
            <button
              type="button"
              onClick={onPrenota}
              className="btn-lime mt-5 w-full justify-center"
            >
              🗓️ Prenota
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(contenuto, document.body) : null;
}
