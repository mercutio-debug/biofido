"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CATEGORY_MAP, PLAN_MAP } from "@/lib/categories";
import { euroCents } from "@/lib/bookings";
import { calcolaImpronta, SEMAFORO } from "@/lib/impronta";
import { loadCatalogo, TIPI_VOCE, type VoceCatalogo } from "@/lib/catalogo";
import { registraEvento } from "@/lib/statistiche";
import type { Business, Product } from "@/lib/biofido-data";
import { businessSlug, elencoBusinessConSlug } from "@/lib/biofido-data";
import { ProdottoDettaglioBio } from "@/components/ProdottoDettaglioBio";
import { EsperienzaDettaglio } from "@/components/EsperienzaDettaglio";
import type { Experience } from "@/lib/bookings";
import { SegnalaModal } from "@/components/SegnalaModal";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { addToCart } from "@/lib/carrello";

/** prezzo numerico → "€ 9,50" (it-IT). */
const euro = (n: number | null) =>
  n == null ? "" : "€ " + n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const tipoLabel = (t: string) => TIPI_VOCE.find((x) => x.id === t)?.label ?? t;

/** Etichette lingue dei servizi (per i turisti stranieri). */
const LINGUE_LABEL: Record<string, string> = {
  it: "🇮🇹 Italiano", en: "🇬🇧 English", fr: "🇫🇷 Français", de: "🇩🇪 Deutsch",
  es: "🇪🇸 Español", pt: "🇵🇹 Português", nl: "🇳🇱 Nederlands", zh: "🇨🇳 中文",
  ru: "🇷🇺 Русский", ar: "🇸🇦 العربية",
};

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
  // Gate "Ci pensiamo noi": se lo shop non è approvato (shop_approvato === false),
  // i prodotti in vendita (in_shop) non compaiono al pubblico.
  const prodotti = (plan.showProducts ? b.products ?? [] : [])
    .filter((p) => b.shop_approvato !== false || !p.in_shop)
    .slice(0, plan.maxProducts);
  // prodotto "aperto" (espanso): mostra descrizione completa + foto grande
  const [prodottoAperto, setProdottoAperto] = useState<{ p: Product; i: number } | null>(null);
  const [esperienzaAperta, setEsperienzaAperta] = useState<Experience | null>(null);
  const sede = { lat: b.lat, lon: b.lon };
  const esperienze = plan.canSell ? b.experiences?.filter((e) => e.attiva) ?? [] : [];
  const router = useRouter();

  // Prenotazione con login OBBLIGATORIO: ospiti → messaggio + iscrizione cliente,
  // salvando il ritorno alla scheda con ?prenota=1 (al rientro il modale si riapre).
  async function apriPrenota() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      try {
        sessionStorage.setItem("postLoginRedirect", `/azienda/${businessSlug(b.name)}/?prenota=1`);
      } catch {
        /* ignore */
      }
      alert(
        "Per prenotare un'esperienza in azienda accedi (o crea un account cliente, è gratis). Dopo l'accesso riprendi da dove eri.",
      );
      // login-first: chi ha già l'account entra subito; i nuovi trovano in cima l'invito «Iscriviti come cliente»
      router.push("/accedi?tipo=cliente");
      return;
    }
    onPrenota?.(b);
  }

  // "Condividi scheda": utile soprattutto in app (TWA), dove non c'è la barra
  // dell'URL da copiare. Condivide l'URL CANONICO /azienda/{slug} (che ha
  // l'anteprima ricca: nome + copertina), via menu nativo Android o copia link.
  const [condiviso, setCondiviso] = useState(false);
  async function condividiScheda() {
    let slug = businessSlug(b.name);
    try {
      const lista = await elencoBusinessConSlug();
      const found = lista.find((x) => String(x.id) === String(b.id));
      if (found) slug = found.slug;
    } catch {
      /* offline o lista non disponibile: uso lo slug derivato dal nome */
    }
    const url = `${window.location.origin}/azienda/${slug}/`;
    const titolo = `${b.name}${b.city ? ` · ${b.city}` : ""} — su BioFido`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: titolo, url });
        return;
      }
    } catch {
      return; /* l'utente ha annullato il menu di condivisione: nessun errore */
    }
    try {
      await navigator.clipboard.writeText(url);
      setCondiviso(true);
      setTimeout(() => setCondiviso(false), 2500);
    } catch {
      /* clipboard non disponibile */
    }
  }

  // Catalogo (funzione Gold): prodotti in vendita + servizi su prenotazione
  const [catalogo, setCatalogo] = useState<VoceCatalogo[]>([]);
  useEffect(() => {
    if (b.owner) loadCatalogo(b.owner).then(setCatalogo).catch(() => {});
  }, [b.owner]);
  // Blocca lo scroll della pagina sotto mentre il modale (non-embedded) è aperto:
  // così su mobile non è la pagina intera a scorrere/zoomare ma solo la scheda.
  useEffect(() => {
    if (embedded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [embedded]);
  // I prodotti ORDINABILI dal catalogo (tipo 'prodotto') restano solo Gold.
  const catalogoVisibile = plan.canSell ? catalogo : [];
  const prodottiCat =
    b.plan === "gold" ? catalogoVisibile.filter((v) => v.tipo === "prodotto") : [];
  // Le esperienze ora vivono nella tabella `esperienze` (b.experiences) — il vecchio
  // "catalogo servizi" è deprecato (era un doppione), quindi non lo mostro più.
  const serviziCat: VoceCatalogo[] = [];
  const [segnala, setSegnala] = useState<VoceCatalogo | null>(null);
  const [servDett, setServDett] = useState<VoceCatalogo | null>(null);
  const [cartMsg, setCartMsg] = useState<string | null>(null);

  // 🛒 Aggiungi al carrello (Fase A): ospite → login; loggato → nel carrello.
  // Gate login per ordinare un PRODOTTO: l'azienda deve sapere chi ha ordinato.
  // I servizi extra restano aperti agli ospiti (richiesta prenotazione).
  async function gateLoginOrdine(): Promise<boolean> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("postLoginRedirect", window.location.pathname + window.location.search);
        } catch {
          /* ignore */
        }
        alert("Per ordinare un prodotto devi registrarti o accedere.");
        // su GitHub Pages il sito è servito sotto /biofido: senza basePath → 404
        window.location.href = (process.env.NEXT_PUBLIC_BASE_PATH || "") + "/accedi?tipo=cliente";
      }
      return false;
    }
    return true;
  }

  const aggiungiCarrello = async (p: Product, i: number) => {
    if (!(await gateLoginOrdine())) return;
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

  const contenuto = (
    <div
      className={embedded ? "" : "fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-3 sm:p-4"}
      onClick={embedded ? undefined : onClose}
    >
      <div
        className={
          embedded
            ? "rounded-2xl border border-[#e3eed7] bg-white p-5"
            : "max-h-[88dvh] w-full max-w-lg overflow-y-auto overflow-x-hidden overscroll-contain rounded-2xl bg-white p-5 shadow-xl sm:max-h-[92vh] sm:p-6"
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* copertina azienda: profilo ricco (Silver e Gold), come su ECO-VISA */}
        {plan.showDescription && b.immagine && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={b.immagine}
            alt={b.name}
            className="mb-4 aspect-[16/9] w-full rounded-xl object-cover object-top"
          />
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex-none text-2xl">{cat.emoji}</span>
              <h2 className="font-display text-2xl text-green-800 break-words">{b.name}</h2>
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

        {/* contatti (il telefono dell'azienda non si mostra più, per sicurezza) */}
        <div className="mt-3 space-y-1 text-sm">
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

        {/* condividi scheda: link canonico con anteprima ricca (utile in app) */}
        {!embedded && (
          <button
            type="button"
            onClick={condividiScheda}
            className="ml-2 mt-3 inline-flex items-center gap-2 rounded-full border border-green-600 px-4 py-1.5 text-sm font-bold text-green-700 hover:bg-leaf"
          >
            🔗 {condiviso ? "Link copiato!" : "Condividi scheda"}
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
                    onClick={() => setProdottoAperto({ p, i })}
                    title="Tocca per vedere i dettagli del prodotto"
                  >
                    {/* foto prodotto: Silver e Gold (Free = solo nome + semaforo) */}
                    {plan.showDescription && p.image && (
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg">
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
                          // luce accesa: verde (super_green/verde/verde_chiaro), gialla o rossa
                          const fam = imp.level === "super_green" || imp.level.startsWith("verde")
                            ? "bottom"
                            : imp.level.startsWith("giallo")
                            ? "mid"
                            : "top";
                          const off = "#46443f";
                          return (
                            <span
                              className="inline-flex flex-none items-center gap-1.5"
                              title={`Semaforo di sostenibilità: ${sem.testo}`}
                            >
                              <svg width="13" height="29" viewBox="0 0 13 29" className="flex-none" aria-hidden="true">
                                <rect x="0.5" y="0.5" width="12" height="28" rx="4" fill="#33402c" />
                                <circle cx="6.5" cy="7" r="3.1" fill={fam === "top" ? sem.colore : off} />
                                <circle cx="6.5" cy="14.5" r="3.1" fill={fam === "mid" ? sem.colore : off} />
                                <circle cx="6.5" cy="22" r="3.1" fill={fam === "bottom" ? sem.colore : off} />
                              </svg>
                              <span
                                className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                                style={{ backgroundColor: `${sem.colore}22`, color: sem.colore }}
                              >
                                {sem.label}
                              </span>
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
                      {plan.showDescription && p.description && (
                        <div className="truncate text-xs text-green-900/60">{p.description}</div>
                      )}
                      <div className="text-[10px] font-semibold text-green-700">tocca per la scheda ▾</div>
                      {b.plan === "gold" && (p.confezione || p.contenuto != null) && (
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
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setServDett(v)}
                      className="rounded-full border border-green-600 px-3 py-1 text-xs font-bold text-green-700 hover:bg-leaf"
                    >
                      🔍 Dettagli e foto
                    </button>
                    {onPrenotaServizio && (
                      <button
                        type="button"
                        onClick={() =>
                          onPrenotaServizio(b, {
                            voceId: v.id,
                            name: v.nome,
                            price: v.prezzo != null ? euro(v.prezzo) : undefined,
                            description: v.descrizione ?? undefined,
                          })
                        }
                        className="rounded-full bg-green-700 px-3 py-1 text-xs font-bold text-white hover:bg-green-800"
                      >
                        ✨ Richiedi prenotazione
                      </button>
                    )}
                  </div>
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
                  <div
                    className="flex cursor-pointer items-start gap-3"
                    onClick={() => setEsperienzaAperta(e)}
                    title="Tocca per i dettagli dell'esperienza"
                  >
                    {e.immagine && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.immagine} alt={e.titolo} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-green-800">{e.titolo}</span>
                        <span className="shrink-0 text-sm font-bold text-green-800">
                          {euroCents(e.prezzoCents)}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-green-900/55">
                        {e.durataMin ? `~${e.durataMin} min · ` : ""}max {e.maxPersone} persone
                        {e.giorniSettimana?.length
                          ? ` · 🗓 ${e.giorniSettimana
                              .map((g) => ["", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"][g])
                              .join(", ")}`
                          : ""}
                        {e.orario ? ` · ${e.orario}` : ""}
                      </div>
                      <div className="text-[10px] font-semibold text-green-700">
                        tocca per i dettagli, la foto e le lingue ▾
                      </div>
                    </div>
                  </div>
                  {onPrenota && (
                    <button
                      type="button"
                      onClick={apriPrenota}
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

        {segnala && segnala.id && (
          <SegnalaModal
            catalogoId={segnala.id}
            prodottoNome={segnala.nome}
            portale="BioFido"
            onClose={() => setSegnala(null)}
          />
        )}

        {servDett && (
          <div
            className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50 p-3 sm:p-4"
            onClick={() => setServDett(null)}
          >
            <div
              className="card max-h-[88dvh] w-full max-w-lg overflow-y-auto overscroll-contain p-0"
              onClick={(e) => e.stopPropagation()}
            >
              {(servDett.immagine || servDett.foto2) && (
                <div className={`grid gap-1 ${servDett.immagine && servDett.foto2 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
                  {[servDett.immagine, servDett.foto2].filter(Boolean).map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={src as string}
                      alt={servDett.nome}
                      className="max-h-72 w-full bg-leaf/30 object-contain first:rounded-tl-2xl last:rounded-tr-2xl"
                    />
                  ))}
                </div>
              )}
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs font-bold uppercase tracking-wide text-lime-500">{tipoLabel(servDett.tipo)}</div>
                    <h3 className="font-display text-2xl text-green-800">{servDett.nome}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setServDett(null)}
                    aria-label="Chiudi"
                    className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-leaf text-green-800 hover:bg-leaf/70"
                  >
                    ✕
                  </button>
                </div>
                {servDett.prezzo != null && (
                  <div className="mt-2 text-2xl font-bold text-green-800">{euro(servDett.prezzo)}</div>
                )}
                {servDett.durata && (
                  <p className="mt-1 text-sm font-semibold text-green-900/75">⏱ Durata: {servDett.durata}</p>
                )}
                {servDett.lingue && servDett.lingue.length > 0 && (
                  <p className="mt-1 text-sm font-semibold text-green-900/75">
                    🗣 Lingue: {servDett.lingue.map((c) => LINGUE_LABEL[c] ?? c).join(" · ")}
                  </p>
                )}
                {servDett.descrizione ? (
                  <p className="mt-3 whitespace-pre-line text-green-900/80">{servDett.descrizione}</p>
                ) : (
                  <p className="mt-3 text-sm text-green-900/45">Nessuna descrizione disponibile.</p>
                )}
                {onPrenotaServizio && (
                  <button
                    type="button"
                    onClick={() => {
                      const v = servDett;
                      setServDett(null);
                      onPrenotaServizio(b, {
                        voceId: v.id,
                        name: v.nome,
                        price: v.prezzo != null ? euro(v.prezzo) : undefined,
                        description: v.descrizione ?? undefined,
                      });
                    }}
                    className="btn-lime mt-5 w-full justify-center text-sm"
                  >
                    ✨ Richiedi prenotazione
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {prodottoAperto && (
          <ProdottoDettaglioBio
            p={prodottoAperto.p}
            gold={b.plan === "gold"}
            canSell={plan.canSell}
            sede={sede}
            onClose={() => setProdottoAperto(null)}
            onPrenota={
              onPrenotaServizio
                ? () => {
                    onPrenotaServizio(b, prodottoAperto.p);
                    setProdottoAperto(null);
                  }
                : undefined
            }
            onCarrello={() => {
              aggiungiCarrello(prodottoAperto.p, prodottoAperto.i);
              setProdottoAperto(null);
            }}
          />
        )}

        {esperienzaAperta && (
          <EsperienzaDettaglio
            e={esperienzaAperta}
            onClose={() => setEsperienzaAperta(null)}
            onPrenota={
              onPrenota
                ? () => {
                    setEsperienzaAperta(null);
                    apriPrenota();
                  }
                : undefined
            }
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

  if (embedded) return contenuto;
  // Portale su document.body: evita che un antenato con transform (la mappa)
  // "agganci" il fixed e renda la scheda decentrata o lo sfondo scrollabile/zoomabile.
  return typeof document !== "undefined" ? createPortal(contenuto, document.body) : null;
}
