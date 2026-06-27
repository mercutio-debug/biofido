"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/* ============================================================================
   DashboardShell — guscio dashboard stile "pannello di controllo" (modello
   Hostinger): sidebar verticale verde COLLASSABILE a icone, contenuto che si
   apre AL CENTRO (un solo pannello attivo per volta, niente scroll infinito).
   Le icone sono SVG monocrome (currentColor) così sono tutte della stessa
   tonalità: VERDE le voci operative, GIALLO i servizi extra.
   Gemello tra ECO-VISA e BioFido: stessa struttura, contenuti parametrizzati.
   ========================================================================== */

export type IconKey =
  | "start" | "piano" | "prodotti" | "catalogo" | "dati" | "bio" | "anteprima"
  | "messaggi" | "prenotazioni" | "ordini" | "statistiche" | "incassi"
  | "extra" | "onboarding" | "attivi" | "spedizioni";

export type DashPanel = {
  id: string;
  label: string;
  icon: IconKey;
  tone?: "verde" | "giallo";
  /** numero/stringa nel pallino rosso; null/0 = nessun badge */
  badge?: number | string | null;
  /** intestazione di gruppo mostrata SOPRA questa voce */
  section?: string;
  content: ReactNode;
  hidden?: boolean;
};

const COLLAPSE_KEY = "dash_sidebar_collassata";

/* ---- set di icone SVG monocrome (stroke currentColor) ---- */
const ICON: Record<IconKey, ReactNode> = {
  start: <path d="M4 21V4m0 0h13l-2.5 4L17 12H4" />,
  piano: <path d="M3 18h18M4 8l4 3 4-6 4 6 4-3-1.5 7H5.5z" />,
  prodotti: <><path d="M3 7l9-4 9 4v10l-9 4-9-4z" /><path d="M3 7l9 4 9-4M12 11v10" /></>,
  catalogo: <path d="M12 3l2.2 5.3L20 9.5l-4 3.6L17.2 19 12 16.2 6.8 19 8 13.1l-4-3.6 5.8-1.2z" />,
  dati: <><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  bio: <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.5 2.5L16 9.5" /></>,
  anteprima: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
  messaggi: <path d="M4 5h16v11H8l-4 4z" />,
  prenotazioni: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9.5h18M8 3v4M16 3v4" /></>,
  ordini: <><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M3 4h2l2.4 12h11l2-8H6" /></>,
  statistiche: <path d="M3 21h18M6 21V11M11 21V5M16 21v-8" />,
  incassi: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10.5h18" /></>,
  extra: <><rect x="3" y="9" width="18" height="11" rx="1.5" /><path d="M3 13h18M12 9v11M12 9s-1.2-5-4-5-2.2 5 4 5zM12 9s1.2-5 4-5 2.2 5-4 5z" /></>,
  onboarding: <path d="M5 19l9-9M13 4.5l2 2M18 8l1.5 1.5M15.5 3l.6.6M9.5 5l.6.6" />,
  attivi: <><path d="M4 6h10M4 12h10M4 18h7" /><path d="M16 16.5l2 2 4-4" /></>,
  spedizioni: <><path d="M3 6h11v9H3zM14 9h4l3 3v3h-7z" /><circle cx="7.5" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></>,
};

function Icona({ k }: { k: IconKey }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICON[k]}
    </svg>
  );
}

export function DashboardShell({
  title,
  header,
  topBar,
  alert,
  panels,
  defaultPanel,
}: {
  /** titolo nell'header sottile */
  title: string;
  /** contenuto a destra dell'header (es. badge piano + Esci) */
  header?: ReactNode;
  /** barra SEMPRE visibile sotto l'header (es. le tre tendine + promo) */
  topBar?: ReactNode;
  /** avviso a tutta larghezza in cima (es. acquisto in sospeso) */
  alert?: ReactNode;
  panels: DashPanel[];
  defaultPanel?: string;
}) {
  const visibili = panels.filter((p) => !p.hidden);
  const [active, setActive] = useState<string>(
    defaultPanel ?? visibili[0]?.id ?? "",
  );
  const [collassata, setCollassata] = useState(false);
  const [drawer, setDrawer] = useState(false); // overlay su mobile
  const wrapRef = useRef<HTMLDivElement>(null);

  // stato collasso ricordato; deep-link ?p=; navigazione via evento dash:goto
  useEffect(() => {
    try {
      setCollassata(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {}
    const p = new URLSearchParams(window.location.search).get("p");
    if (p && panels.some((x) => x.id === p && !x.hidden)) setActive(p);
    const onGoto = (e: Event) => {
      const id = (e as CustomEvent).detail as string;
      if (panels.some((x) => x.id === id && !x.hidden)) {
        setActive(id);
        setDrawer(false);
        wrapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    window.addEventListener("dash:goto", onGoto);
    return () => window.removeEventListener("dash:goto", onGoto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleCollasso() {
    setCollassata((v) => {
      const n = !v;
      try {
        localStorage.setItem(COLLAPSE_KEY, n ? "1" : "0");
      } catch {}
      return n;
    });
  }

  function vai(id: string) {
    setActive(id);
    setDrawer(false);
    wrapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const corrente = visibili.find((p) => p.id === active) ?? visibili[0];

  return (
    <div ref={wrapRef} className="mx-auto max-w-6xl scroll-mt-4 px-3 py-6">
      <div className="overflow-hidden rounded-2xl border border-[#e3eed7] bg-white shadow-sm">
        {/* header sottile */}
        <div className="flex items-center gap-3 border-b border-[#eef3e6] bg-[#fafdf6] px-4 py-3">
          <button
            type="button"
            onClick={() => {
              // mobile: apri/chiudi drawer; desktop: collassa/espandi
              if (window.matchMedia("(max-width: 767px)").matches) setDrawer((v) => !v);
              else toggleCollasso();
            }}
            aria-label="Menu"
            className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-[#d7e6c6] text-green-700 hover:bg-leaf/50"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="truncate font-display text-base text-green-800">{title}</div>
          <div className="ml-auto flex items-center gap-3">{header}</div>
        </div>

        {alert && <div className="border-b border-[#eef3e6] bg-[#fffbe9] px-4 py-3">{alert}</div>}

        {/* barra SEMPRE visibile (le tre tendine: piani · servizi extra · onboarding) */}
        {topBar && <div className="border-b border-[#eef3e6] bg-white px-3 py-2.5">{topBar}</div>}

        <div className="relative flex min-h-[560px]">
          {/* backdrop drawer mobile */}
          {drawer && (
            <button
              aria-label="Chiudi menu"
              onClick={() => setDrawer(false)}
              className="absolute inset-0 z-20 bg-black/30 md:hidden"
            />
          )}

          {/* SIDEBAR */}
          <nav
            className={`z-30 flex-none border-r border-[#eef3e6] bg-white p-2 transition-[width] duration-150 md:relative md:translate-x-0 ${
              collassata ? "md:w-[60px]" : "md:w-[216px]"
            } ${
              drawer
                ? "absolute inset-y-0 left-0 w-[230px] translate-x-0 shadow-xl"
                : "absolute inset-y-0 left-0 w-[230px] -translate-x-full md:w-auto"
            }`}
          >
            {visibili.map((p, i) => {
              const giallo = p.tone === "giallo";
              const on = p.id === corrente?.id;
              const prev = visibili[i - 1];
              return (
                <div key={p.id}>
                  {p.section && p.section !== prev?.section && (
                    <div
                      className={`px-2 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-green-900/40 ${
                        collassata ? "md:invisible" : ""
                      }`}
                    >
                      {p.section}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => vai(p.id)}
                    title={p.label}
                    className={`relative flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[13.5px] font-semibold transition ${
                      giallo
                        ? on
                          ? "bg-[#fcf2d6] text-[#7a5b00]"
                          : "text-[#9a7400] hover:bg-[#fdf6e3]"
                        : on
                          ? "bg-[#e7f3da] text-green-900"
                          : "text-green-800/90 hover:bg-leaf/50"
                    }`}
                  >
                    {on && (
                      <span
                        className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full"
                        style={{ background: giallo ? "#e7af0b" : "#45a82f" }}
                      />
                    )}
                    <span className="flex-none">
                      <Icona k={p.icon} />
                    </span>
                    <span className={`flex-1 truncate ${collassata ? "md:hidden" : ""}`}>{p.label}</span>
                    {!!p.badge && p.badge !== 0 && (
                      <span
                        className={`flex h-[18px] min-w-[18px] flex-none items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${
                          collassata ? "md:hidden" : ""
                        }`}
                        style={{ background: "#e24b4a" }}
                      >
                        {p.badge}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </nav>

          {/* CENTRO: un solo pannello attivo */}
          <main className="min-w-0 flex-1 bg-[#fcfdfa] p-4 md:p-6">
            {corrente?.content}
          </main>
        </div>
      </div>
    </div>
  );
}

/** Naviga a un pannello da QUALSIASI componente (sostituisce gli scroll-to-ancora). */
export function vaiAlPannello(id: string) {
  window.dispatchEvent(new CustomEvent("dash:goto", { detail: id }));
}

/**
 * Barra superiore con i menù a tendina: i PULSANTI stanno in riga, ma il pannello
 * APERTO si espande a TUTTA LARGHEZZA sotto la riga (così piani/servizi non si
 * schiacciano nella colonna stretta). Un solo pannello aperto per volta.
 */
export function BarraTendine({
  voci,
  promo,
}: {
  voci: { id: string; icona: string; label: string; tone?: "verde" | "giallo"; content: ReactNode }[];
  promo?: ReactNode;
}) {
  const [aperta, setAperta] = useState<string | null>(null);
  // apertura di una tendina da evento esterno (es. popup promozionale)
  useEffect(() => {
    const onT = (e: Event) => {
      const id = (e as CustomEvent).detail as string;
      if (voci.some((v) => v.id === id)) setAperta(id);
    };
    window.addEventListener("dash:tendina", onT);
    return () => window.removeEventListener("dash:tendina", onT);
  }, [voci]);
  return (
    <div>
      <div className="flex flex-col gap-2 lg:flex-row">
        {voci.map((v) => {
          const giallo = v.tone === "giallo";
          const on = aperta === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setAperta((a) => (a === v.id ? null : v.id))}
              className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-semibold transition ${
                giallo
                  ? "border-badge-yellow bg-[#fffbe9] text-[#7a5b00]"
                  : on
                    ? "border-green-600 bg-[#e7f3da] text-green-900"
                    : "border-[#d7e6c6] bg-[#f3f9ee] text-green-800"
              }`}
            >
              <span className="flex-none">{v.icona}</span>
              <span className="flex-1 truncate text-left">{v.label}</span>
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={2} strokeLinecap="round" aria-hidden
                className={`flex-none transition-transform ${on ? "rotate-180" : ""}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          );
        })}
        {promo}
      </div>
      {voci.map(
        (v) =>
          aperta === v.id && (
            <div key={v.id} className="mt-2 rounded-xl border border-[#e3eed7] bg-white p-3 md:p-4">
              {v.content}
            </div>
          ),
      )}
    </div>
  );
}

/** Menù a tendina (comparsa/scomparsa) per la barra superiore sempre visibile. */
export function Tendina({
  icona,
  label,
  tone = "verde",
  defaultOpen = false,
  children,
}: {
  icona: string;
  label: string;
  tone?: "verde" | "giallo";
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const giallo = tone === "giallo";
  return (
    <details open={defaultOpen} className="group min-w-0 flex-1">
      <summary
        className={`flex cursor-pointer list-none items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-semibold ${
          giallo
            ? "border-badge-yellow bg-[#fffbe9] text-[#7a5b00]"
            : "border-[#d7e6c6] bg-[#f3f9ee] text-green-800"
        }`}
      >
        <span className="flex-none">{icona}</span>
        <span className="flex-1 truncate">{label}</span>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth={2} strokeLinecap="round" aria-hidden
          className="flex-none transition-transform group-open:rotate-180"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <div className="mt-2 rounded-xl border border-[#e3eed7] bg-white p-3">{children}</div>
    </details>
  );
}
