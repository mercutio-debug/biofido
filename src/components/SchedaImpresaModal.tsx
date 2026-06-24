"use client";

import { useEffect, useState } from "react";
import { CATEGORY_MAP, PLAN_MAP } from "@/lib/categories";
import { euroCents } from "@/lib/bookings";
import { calcolaImpronta, SEMAFORO } from "@/lib/impronta";
import { loadCatalogo, TIPI_VOCE, type VoceCatalogo } from "@/lib/catalogo";
import { registraEvento } from "@/lib/statistiche";
import type { Business, Product } from "@/lib/biofido-data";
import { OrdineProdottoModal } from "@/components/OrdineProdottoModal";
import { SegnalaModal } from "@/components/SegnalaModal";
import { supabase } from "@/lib/supabase";
import { addToCart } from "@/lib/carrello";

/** prezzo numerico → "€ 9,50" (it-IT). */
const euro = (n: number | null) =>
  n == null ? "" : "€ " + n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const tipoLabel = (t: string) => TIPI_VOCE.find((x) => x.id === t)?.label ?? t;

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
  onPrenotaServizio,
  onContatta,
  embedded = false,
}: {
  business: Business;
  onClose?: () => void;
  onPrenota?: (b: Business) => void;
  /** prenotazione di un singolo servizio extra del catalogo prodotti */
  onPrenotaServizio?: (b: Business, servizio: Product) => void;
  /** apre la chat "Contatta l'azienda" (messaggio diretto, anche da ospite) */
  onContatta?: (b: Business) => void;
  /** true = mostra il contenuto inline (anteprima in dashboard), senza overlay/modale */
  embedded?: boolean;
}) {
  const cat = CATEGORY_MAP[b.category];
  const plan = PLAN_MAP[b.plan];
  const dir = `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lon}`;
  const prodotti = (plan.showProducts ? b.products ?? [] : []).slice(0, plan.maxProducts);
  // prodotto "aperto" (espanso): mostra descrizione completa + foto grande
  const [apertoProd, setApertoProd] = useState<number | null>(null);
  const sede = { lat: b.lat, lon: b.lon };
  const esperienze = plan.canSell ? b.experiences?.filter((e) => e.attiva) ?? [] : [];

  // Catalogo (funzione Gold): prodotti in vendita + servizi su prenotazione
  const [catalogo, setCatalogo] = useState<VoceCatalogo[]>([]);
  useEffect(() => {
    if (b.owner) loadCatalogo(b.owner).then(setCatalogo).catch(() => {});
  }, [b.owner]);
  // Il catalogo (prodotti in vendita + servizi su prenotazione) è una funzione
  // Gold: sotto quel piano (es. dopo un downgrade) non va mostrato.
  const catalogoVisibile = b.plan === "gold" ? catalogo : [];
  const prodottiCat = catalogoVisibile.filter((v) => v.tipo === "prodotto");
  const serviziCat = catalogoVisibile.filter((v) => v.tipo !== "prodotto");
  const [ordina, setOrdina] = useState<VoceCatalogo | null>(null);
  const [segnala, setSegnala] = useState<VoceCatalogo | null>(null);
  const [cartMsg, setCartMsg] = useState<string | null>(null);

  // 🛒 Aggiungi al carrello (Fase A): ospite → login; loggato → nel carrello.
  const aggiungiCarrello = async (p: Product, i: number) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(
            "postLoginRedirect",
            window.location.pathname + window.location.search,
          );
        } catch {
          /* ignore */
        }
        alert("Per ordinare questo prodotto devi registrarti o accedere.");
        window.location.href = "/accedi";
      }
      return;
    }
    addToCart({
      prodottoId: p.id ?? `${b.id}-${i}`,
      nome: p.name,
      prezzo: p.price ?? null,
      aziendaId: String(b.id),
      aziendaNome: b.name,
      owner: b.owner ?? null,
      immagine: p.image ?? null,
      giacenza: p.giacenza ?? null,
    });
    setCartMsg(`“${p.name}” aggiunto al carrello`);
    setTimeout(() => setCartMsg(null), 2500);
  };

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
        {/* copertina azienda: profilo ricco (Silver e Gold), come su ECO-VISA */}
        {plan.showDescription && b.immagine && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={b.immagine}
            alt={b.name}
            className="mb-4 h-40 w-full rounded-xl object-cover"
          />
        )}
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
              <a
                href={`tel:${b.phone}`}
                onClick={() => b.owner && registraEvento(b.owner, "contatto")}
                className="font-semibold text-green-700 hover:text-lime-500"
              >
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
                onClick={() => b.owner && registraEvento(b.owner, "contatto")}
                className="font-semibold text-green-700 hover:text-lime-500"
              >
                {b.website}
              </a>
            </div>
          )}
        </div>

        {/* contatta l'azienda: chat diretta (anche da ospite) → email all'azienda */}
        {onContatta && b.owner && (
          <button
            type="button"
            onClick={() => {
              registraEvento(b.owner!, "contatto");
              onContatta(b);
            }}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-green-600 px-4 py-1.5 text-sm font-bold text-green-700 hover:bg-leaf"
          >
            ✉️ Contatta l&apos;azienda
          </button>
        )}

        {/* prodotti */}
        {prodotti.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-green-700">Prodotti</h3>
            <ul className="mt-2 space-y-2">
              {prodotti.map((p, i) => (
                <li
                  key={i}
                  className={`flex flex-col gap-2 rounded-xl border bg-white p-2 ${
                    plan.canSell && p.prenotabile ? "border-badge-yellow" : "border-[#e3eed7]"
                  }`}
                >
                  <div
                    className="flex cursor-pointer items-center gap-3"
                    onClick={() => setApertoProd(apertoProd === i ? null : i)}
                    title="Tocca per vedere i dettagli del prodotto"
                  >
                    {/* foto: solo Gold (su downgrade sparisce). Grande se aperto. */}
                    {b.plan === "gold" && p.image && (
                      <div
                        className={`${apertoProd === i ? "h-24 w-24" : "h-14 w-14"} shrink-0 overflow-hidden rounded-lg transition-all`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.image}
                          alt={p.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {p.mostraSemaforo !== false && (p.ingredients?.length ?? 0) > 0 && (() => {
                          const imp = calcolaImpronta(sede, p.ingredients ?? []);
                          const sem = SEMAFORO[imp.level];
                          return (
                            <span
                              className="inline-flex flex-none items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize"
                              style={{ backgroundColor: `${sem.colore}22`, color: sem.colore }}
                              title={`Semaforo di sostenibilità: ${sem.testo}`}
                            >
                              <span className="h-2 w-2 rounded-full" style={{ background: sem.colore }} />
                              {imp.level}
                            </span>
                          );
                        })()}
                        <div className="truncate font-semibold text-green-800">{p.name}</div>
                        {plan.canSell && p.prenotabile && (
                          <span className="shrink-0 rounded-full bg-badge-yellow px-2 text-[10px] font-bold text-[#7a1f00]">
                            PRENOTABILE
                          </span>
                        )}
                      </div>
                      {p.description && (
                        <div
                          className={`text-xs text-green-900/60 ${apertoProd === i ? "whitespace-pre-line" : "truncate"}`}
                        >
                          {p.description}
                        </div>
                      )}
                      {p.description && apertoProd !== i && (
                        <div className="text-[10px] font-semibold text-green-700">tocca per i dettagli ▾</div>
                      )}
                      {(p.confezione || p.contenuto != null) && (
                        <div className="text-xs font-semibold text-green-900/70">
                          {[
                            p.confezione,
                            p.contenuto != null ? `${p.contenuto} ${p.unita ?? ""}`.trim() : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      )}
                      {p.durata && (
                        <div className="text-xs font-semibold text-green-900/70">⏱ Durata: {p.durata}</div>
                      )}
                    </div>
                    {/* prezzo: solo Gold (su downgrade sparisce) */}
                    {b.plan === "gold" && p.price && (
                      <div className="shrink-0 text-right text-sm font-semibold text-green-800">
                        {p.price}
                        {p.unit ? <span className="text-xs font-normal text-green-900/55"> {p.unit}</span> : null}
                      </div>
                    )}
                  </div>
                  {plan.canSell && p.prenotabile && onPrenotaServizio && (
                    <button
                      type="button"
                      onClick={() => onPrenotaServizio(b, p)}
                      className="self-start rounded-full bg-green-700 px-3 py-1 text-xs font-bold text-white hover:bg-green-800"
                    >
                      ✨ Prenota / richiedi
                    </button>
                  )}
                  {b.plan === "gold" && p.foto2 && apertoProd === i && (
                    <figure>
                      <div className="h-24 w-full overflow-hidden rounded-lg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.foto2}
                          alt={`${p.name} — etichetta`}
                          className="h-24 w-full object-cover transition-transform duration-300 hover:scale-150"
                        />
                      </div>
                      <figcaption className="mt-1 text-center text-xs font-semibold text-green-900/60">
                        Etichetta
                      </figcaption>
                    </figure>
                  )}
                  {b.plan === "gold" &&
                    p.in_shop &&
                    (p.giacenza === 0 ? (
                      <span className="self-start rounded-full bg-[#f3dada] px-3 py-1 text-xs font-bold text-traffic-red">
                        Esaurito
                      </span>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => aggiungiCarrello(p, i)}
                          className="rounded-full bg-green-700 px-3 py-1 text-xs font-bold text-white hover:bg-green-800"
                        >
                          🛒 Aggiungi al carrello
                        </button>
                        {typeof p.giacenza === "number" && (
                          <span className="text-[11px] font-semibold text-green-900/55">
                            Disponibili: {p.giacenza}
                          </span>
                        )}
                      </div>
                    ))}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* catalogo: prodotti in vendita (con prezzo) */}
        {prodottiCat.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-green-700">In vendita</h3>
            <ul className="mt-2 space-y-2">
              {prodottiCat.map((v) => (
                <li key={v.id} className="flex flex-col gap-2 rounded-xl border border-[#e3eed7] bg-white p-2">
                  <div className="flex items-center gap-3">
                    {v.immagine && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.immagine} alt={v.nome} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-green-800">{v.nome}</div>
                      {v.descrizione && (
                        <div className="whitespace-pre-line text-xs text-green-900/70">{v.descrizione}</div>
                      )}
                    </div>
                    {v.prezzo != null && (
                      <div className="shrink-0 text-right text-sm font-semibold text-green-800">
                        {euro(v.prezzo)}
                        {v.unita ? <span className="text-xs font-normal text-green-900/55"> {v.unita}</span> : null}
                      </div>
                    )}
                  </div>
                  {b.owner && v.id && (
                    <button
                      type="button"
                      onClick={() => setOrdina(v)}
                      className="self-start rounded-full bg-green-700 px-3 py-1 text-xs font-bold text-white hover:bg-green-800"
                    >
                      🛒 Ordina
                    </button>
                  )}
                  {v.id && (
                    <button
                      type="button"
                      onClick={() => setSegnala(v)}
                      className="self-start text-[11px] font-semibold text-green-900/45 hover:text-traffic-red"
                    >
                      ⚠️ Segnala
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* catalogo: servizi su prenotazione (visite, laboratori, esperienze) */}
        {serviziCat.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-green-700">
              Servizi su prenotazione
            </h3>
            <ul className="mt-2 space-y-2">
              {serviziCat.map((v) => (
                <li key={v.id} className="rounded-xl border border-badge-yellow bg-[#fffbe9] p-3">
                  <div className="flex items-center gap-3">
                    {v.immagine && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.immagine} alt={v.nome} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-lime-600">
                        {tipoLabel(v.tipo)}
                      </div>
                      <div className="truncate font-semibold text-green-800">{v.nome}</div>
                      {v.descrizione && (
                        <div className="whitespace-pre-line text-xs text-green-900/70">{v.descrizione}</div>
                      )}
                    </div>
                    {v.prezzo != null && (
                      <div className="shrink-0 text-sm font-bold text-green-800">{euro(v.prezzo)}</div>
                    )}
                  </div>
                  {onPrenotaServizio && (
                    <button
                      type="button"
                      onClick={() =>
                        // converto la voce-catalogo in "servizio" (Product): apre
                        // RichiestaServizioModal che calcola prezzo × persone.
                        onPrenotaServizio(b, {
                          voceId: v.id,
                          name: v.nome,
                          price: v.prezzo != null ? euro(v.prezzo) : undefined,
                          description: v.descrizione ?? undefined,
                        })
                      }
                      className="mt-2 rounded-full bg-green-700 px-3 py-1 text-xs font-bold text-white hover:bg-green-800"
                    >
                      ✨ Richiedi prenotazione
                    </button>
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
          onClick={() => b.owner && registraEvento(b.owner, "indicazioni")}
          className="btn-lime mt-5 inline-block w-full text-center"
        >
          🐾 Raggiungila
        </a>

        {ordina && b.owner && (
          <OrdineProdottoModal
            prodottoId={ordina.id!}
            owner={b.owner}
            prodottoNome={ordina.nome}
            prezzo={ordina.prezzo != null ? euro(ordina.prezzo) : null}
            aziendaNome={b.name}
            portale="BioFido"
            onClose={() => setOrdina(null)}
          />
        )}

        {segnala && segnala.id && (
          <SegnalaModal
            catalogoId={segnala.id}
            prodottoNome={segnala.nome}
            portale="BioFido"
            onClose={() => setSegnala(null)}
          />
        )}

        {cartMsg && (
          <div className="fixed bottom-5 left-1/2 z-[1100] -translate-x-1/2 rounded-full bg-green-800 px-5 py-2 text-sm font-bold text-white shadow-lg">
            🛒 {cartMsg}
          </div>
        )}
      </div>
    </div>
  );
}
