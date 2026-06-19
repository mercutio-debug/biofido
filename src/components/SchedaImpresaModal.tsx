"use client";

import { CATEGORY_MAP, PLAN_MAP } from "@/lib/categories";
import { euroCents } from "@/lib/bookings";
import { calcolaImpronta, SEMAFORO } from "@/lib/impronta";
import type { Business } from "@/lib/biofido-data";

/**
 * Pagina dell'impresa (in modale) aperta cliccando il segnaposto o la voce in
 * elenco. Mostra le informazioni IN BASE AL PIANO dell'azienda:
 *  - Free: nome, categoria, contatti, elenco prodotti (senza foto);
 *  - Silver: + descrizione, sito web, foto prodotti;
 *  - Gold: + più prodotti/foto, esperienze prenotabili in evidenza.
 */
export function SchedaImpresaModal({
  business: b,
  onClose,
  onPrenota,
  embedded = false,
}: {
  business: Business;
  onClose?: () => void;
  onPrenota?: (b: Business) => void;
  /** true = mostra il contenuto inline (anteprima in dashboard), senza overlay/modale */
  embedded?: boolean;
}) {
  const cat = CATEGORY_MAP[b.category];
  const plan = PLAN_MAP[b.plan];
  const dir = `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lon}`;
  const prodotti = (plan.showProducts ? b.products ?? [] : []).slice(0, plan.maxProducts);
  const sede = { lat: b.lat, lon: b.lon };
  const esperienze = plan.canSell ? b.experiences?.filter((e) => e.attiva) ?? [] : [];

  return (
    <div
      className={embedded ? "" : "fixed inset-0 z-[1000] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"}
      onClick={embedded ? undefined : onClose}
    >
      <div
        className={
          embedded
            ? "rounded-2xl border border-[#e3eed7] bg-white p-5"
            : "max-h-[92vh] w-full max-w-lg overflow-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
        }
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{cat.emoji}</span>
              <h2 className="font-display text-2xl text-green-800">{b.name}</h2>
            </div>
            <p className="mt-1 text-sm text-green-900/65">
              {cat.label} · {b.city}
              {b.address ? ` · ${b.address}` : ""}
            </p>
          </div>
          {!embedded && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Chiudi"
              className="shrink-0 rounded-full px-2 text-xl text-green-900/60 hover:bg-leaf"
            >
              ✕
            </button>
          )}
        </div>

        {b.plan !== "free" && (
          <span
            className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${
              b.plan === "gold" ? "bg-badge-yellow text-[#7a1f00]" : "bg-[#c9d3da] text-[#33414a]"
            }`}
          >
            {b.plan === "gold" ? "★ GOLD" : "SILVER"}
          </span>
        )}

        {/* descrizione: Silver/Gold */}
        {plan.showDescription && b.description && (
          <p className="mt-3 text-sm text-green-900/85">{b.description}</p>
        )}

        {/* contatti */}
        <div className="mt-3 space-y-1 text-sm">
          {b.phone && (
            <div>
              📞{" "}
              <a href={`tel:${b.phone}`} className="font-semibold text-green-700 hover:text-lime-500">
                {b.phone}
              </a>
            </div>
          )}
          {plan.showWebsite && b.website && (
            <div>
              🌐{" "}
              <a
                href={b.website.startsWith("http") ? b.website : `https://${b.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-green-700 hover:text-lime-500"
              >
                {b.website}
              </a>
            </div>
          )}
        </div>

        {/* prodotti */}
        {prodotti.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-green-700">Prodotti</h3>
            <ul className="mt-2 space-y-2">
              {prodotti.map((p, i) => (
                <li key={i} className="flex items-center gap-3 rounded-xl border border-[#e3eed7] bg-white p-2">
                  {plan.maxPhotos > 0 && p.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt={p.name} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {p.mostraSemaforo !== false && (p.ingredients?.length ?? 0) > 0 && (() => {
                        const sem = SEMAFORO[calcolaImpronta(sede, p.ingredients ?? []).level];
                        return (
                          <span
                            className="h-3 w-3 flex-none rounded-full"
                            style={{ background: sem.colore }}
                            title={`Semaforo di sostenibilità: ${sem.testo}`}
                          />
                        );
                      })()}
                      <div className="truncate font-semibold text-green-800">{p.name}</div>
                    </div>
                    {p.description && (
                      <div className="truncate text-xs text-green-900/60">{p.description}</div>
                    )}
                  </div>
                  {p.price && (
                    <div className="shrink-0 text-right text-sm font-semibold text-green-800">
                      {p.price}
                      {p.unit ? <span className="text-xs font-normal text-green-900/55"> {p.unit}</span> : null}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* esperienze prenotabili */}
        {esperienze.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-green-700">
              Esperienze prenotabili
            </h3>
            <ul className="mt-2 space-y-2">
              {esperienze.map((e) => (
                <li key={e.id} className="rounded-xl border border-badge-yellow bg-[#fffbe9] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-green-800">{e.titolo}</span>
                    <span className="shrink-0 text-sm font-bold text-green-800">
                      {euroCents(e.prezzoCents)}
                    </span>
                  </div>
                  {e.descrizione && (
                    <p className="mt-1 text-xs text-green-900/70">{e.descrizione}</p>
                  )}
                  {onPrenota && (
                    <button
                      type="button"
                      onClick={() => onPrenota(b)}
                      className="mt-2 rounded-full bg-green-700 px-3 py-1 text-xs font-bold text-white hover:bg-green-800"
                    >
                      🗓️ Prenota
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <a
          href={dir}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-lime mt-5 inline-block w-full text-center"
        >
          🐾 Raggiungila
        </a>
      </div>
    </div>
  );
}
