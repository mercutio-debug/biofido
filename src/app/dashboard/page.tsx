"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import { PianiAbbonamento } from "@/components/Abbonamenti";
import { PLAN_MAP, CATEGORIES, isDowngrade, perditeDowngrade, type Plan, type CategoryId } from "@/lib/categories";
import {
  loadMyBusiness,
  saveMyBusiness,
  type Business,
  type Product,
} from "@/lib/biofido-data";
import dynamic from "next/dynamic";
import { ComuneAutocomplete } from "@/components/ComuneAutocomplete";
import { IndirizzoAutocomplete } from "@/components/IndirizzoAutocomplete";

const MappaPicker = dynamic(() => import("@/components/MappaPicker"), { ssr: false });
import { ProdottoEditor } from "@/components/ProdottoEditor";
import { calcolaImpronta, SEMAFORO } from "@/lib/impronta";
import { getMyPlan } from "@/lib/plan";
import {
  PASSI,
  FUNZIONI,
  planAllows,
  nextPlan,
  type PassoKey,
} from "@/lib/funzioni";
import { billingEnabled, startCheckout, openCustomerPortal } from "@/lib/billing";
import { getExtraScelti, setExtraScelto } from "@/lib/extra-selezionati";
import {
  getAcquistoSospeso,
  pulisciAcquistoSospeso,
  type AcquistoSospeso,
} from "@/lib/acquisto-sospeso";
import { PurchasePopup } from "@/components/PurchasePopup";
import { DashboardPlanHeader } from "@/components/DashboardPlanHeader";
import { OnboardingCard } from "@/components/OnboardingCard";
import { DatiFatturazioneForm, type PrefillFatturazione } from "@/components/DatiFatturazioneForm";
import { SezioneBio } from "@/components/SezioneBio";
import { SchedaServizi } from "@/components/SchedaServizi";
import { ServiziExtra } from "@/components/ServiziExtra";
import { GoldPromoBanner } from "@/components/GoldPromoBanner";
import { caricaImmagineCatalogo, LINGUE_SERVIZIO } from "@/lib/catalogo";
import { startOnboarding, refreshConnectStatus, captureBooking, cancelBooking } from "@/lib/connect";
import {
  listMyExperiences,
  createExperience,
  updateExperience,
  deleteExperience,
  listMyBookings,
  setBookingStatus,
  sendMessage,
  euroCents,
  STATO_LABEL,
  numeroPrenotazioneFmt,
  dataOraPrenotazione,
  type Experience,
  type Fascia,
  type Booking,
  type BookingStatus,
} from "@/lib/bookings";
import { ChatPrenotazione } from "@/components/ChatPrenotazione";
import { listContatti, setContattoGestito, type Contatto } from "@/lib/contatti";
import { NotificheToggle } from "@/components/NotificheToggle";
import { SmsNotificheToggle } from "@/components/SmsNotificheToggle";
import { StatisticheCard } from "@/components/StatisticheCard";
import { AnteprimaScheda } from "@/components/AnteprimaScheda";
import { OrdiniShopRicevuti } from "@/components/OrdiniShopRicevuti";
import { SpedizioneConfigCard } from "@/components/SpedizioneConfigCard";
import { MagazzinoCard, type VoceMagazzino } from "@/components/MagazzinoCard";
import { livelloMagazzino, peggiorLivello, COLORE_MAGAZZINO } from "@/lib/magazzino";
import { ImportoInput } from "@/components/ImportoInput";
import { euroToCents } from "@/lib/prezzo";
import { pushConfigured } from "@/lib/push";
import { DashboardShell, BarraTendine, vaiAlPannello, type DashPanel } from "@/components/DashboardShell";
import { LegendaPianiSlider } from "@/components/LegendaPianiSlider";
import { PromoTimer } from "@/components/PromoTimer";
import { CrossPortalBanner } from "@/components/CrossPortalBanner";
import { URL_ECOVISA } from "@/lib/portale";
import { businessSlug } from "@/lib/biofido-data";
import { contaInSospeso } from "@/lib/contatori";
import { getMyExtras, getStatoOnboarding } from "@/lib/onboarding";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  // piano effettivo (pagato/admin) e piano che l'azienda sta configurando
  const [activePlan, setActivePlan] = useState<Plan>("free");
  const [pianoScelto, setPianoScelto] = useState<Plan>("free");
  const [periodo, setPeriodo] = useState<"monthly" | "annual">("annual");
  // popup-carrello del pagamento (reminder all'azienda quando sceglie un piano)
  const [popupPag, setPopupPag] = useState<{ plan: Plan; period: "monthly" | "annual" } | null>(null);
  // BioFido è riservato alle aziende bio: la certificazione è obbligatoria
  const [bioOk, setBioOk] = useState(false);
  // onboarding già attivato? (per il cursore e il menu "Servizi attivi")
  const [onbAttivo, setOnbAttivo] = useState(false);
  // contatori per i badge della sidebar (ordini/prenotazioni in attesa)
  const [conte, setConte] = useState({ ordini: 0, prenotazioni: 0 });
  // Acquisto in sospeso (pagamento avviato ma non completato): card "Completa".
  const [sospeso, setSospeso] = useState<AcquistoSospeso | null>(null);
  // righe magazzino (prodotti shop con giacenza gestita) per la sezione + pallino
  const [magVoci, setMagVoci] = useState<VoceMagazzino[]>([]);

  // badge sidebar + stato onboarding (best-effort, non bloccante)
  useEffect(() => {
    if (!user) return;
    contaInSospeso().then(setConte).catch(() => {});
    getMyExtras()
      .then((ex) => setOnbAttivo(ex.includes("onboarding")))
      .catch(() => {});
    // magazzino: prodotti dello shop con giacenza gestita
    loadMyBusiness(user.id)
      .then((b) => {
        const voci: VoceMagazzino[] = (b?.products ?? [])
          .filter((p) => p.in_shop && p.giacenza != null)
          .map((p) => ({ nome: p.name, giacenza: p.giacenza, iniziale: p.giacenza_iniziale }));
        setMagVoci(voci);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/accedi");
      return;
    }
    // La dashboard è l'AREA ATTIVITÀ: un cliente non deve finirci.
    if ((user.user_metadata as { tipo?: string } | undefined)?.tipo === "cliente") {
      router.replace("/");
      return;
    }
    setLoading(false);
  }, [authLoading, user, router]);

  // piano attivo + inizializzazione del piano scelto per la configurazione
  useEffect(() => {
    if (!user) return;
    getMyPlan().then((p) => {
      setActivePlan(p);
      // Parto SEMPRE dal piano reale (un Free vede selezionato Free, non Gold).
      setPianoScelto(p);
      try {
        window.localStorage.setItem("biofido_piano_scelto", p);
      } catch {
        /* ignore */
      }
    });
  }, [user]);

  // Acquisto in sospeso: al mount leggo il marcatore; se il ritorno è "ok" lo
  // pulisco, altrimenti mostro la card "Completa il tuo acquisto".
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("abbonamento") === "ok") {
      pulisciAcquistoSospeso();
      setSospeso(null);
      return;
    }
    setSospeso(getAcquistoSospeso());
  }, []);

  // Se il piano in sospeso risulta attivo, l'acquisto è concluso: pulisco.
  useEffect(() => {
    if (sospeso && activePlan !== "free" && activePlan === sospeso.plan) {
      pulisciAcquistoSospeso();
      setSospeso(null);
    }
  }, [activePlan, sospeso]);

  function riprendiAcquisto() {
    if (!sospeso) return;
    for (const k of sospeso.extras) setExtraScelto(k, true);
    setPianoScelto(sospeso.plan as Plan);
    setPeriodo(sospeso.period);
    setPopupPag({ plan: sospeso.plan as Plan, period: sospeso.period });
  }

  async function scegliPiano(p: Plan, per: "monthly" | "annual") {
    const downgrade = isDowngrade(activePlan, p);
    // Downgrade: avviso che i contenuti/funzioni non inclusi nel piano scelto
    // non saranno più visibili (i dati restano salvati, tornano col re-upgrade).
    if (downgrade) {
      const perse = perditeDowngrade(activePlan, p);
      const elenco = perse.length ? "\n\n• " + perse.join("\n• ") : "";
      const ok = window.confirm(
        `⚠️ ATTENZIONE — stai passando dal piano ${PLAN_MAP[activePlan].label} al piano ${PLAN_MAP[p].label}, meno ricco.\n\n` +
          `Con questo cambio NON saranno più visibili sulla tua scheda:${elenco}\n\n` +
          `I dati non vengono cancellati: torneranno visibili se in futuro risali di piano.\n\n` +
          `Vuoi procedere con il downgrade?`,
      );
      if (!ok) return;
    }

    setPianoScelto(p);
    setPeriodo(per);
    window.localStorage.setItem("biofido_piano_scelto", p);
    // Piano a pagamento → si apre SEMPRE il popup-carrello, che poi decide
    // checkout (Free) o cambio piano con conguaglio (già abbonato).
    if (p !== "free") setPopupPag({ plan: p, period: per });
  }

  // Acquisto di un SERVIZIO EXTRA dalla dashboard: apre il popup-carrello sul
  // piano minimo che lo include (o sul piano attuale), col servizio preselezionato.
  function acquistaServizio(key: string) {
    const need = key === "onboarding" ? 2 : 1;
    const rank: Record<string, number> = { free: 0, silver: 1, gold: 2 };
    const target: Plan = (rank[activePlan] ?? 0) >= need ? (activePlan as Plan) : need >= 2 ? "gold" : "silver";
    setExtraScelto(key, true);
    setPianoScelto(target);
    setPeriodo(periodo);
    setPopupPag({ plan: target, period: periodo });
  }

  if (authLoading || loading) {
    return <div className="mx-auto max-w-4xl px-4 py-16 text-green-900/70">Caricamento…</div>;
  }

  // PAGINE dedicate (a tutto schermo) per tenere ordinata la dashboard:
  //  • "dati"     → anagrafica, dati fiscali, posizione sulla mappa
  //  • "prodotti" → inserimento prodotti (col semaforo) e servizi extra
  if (!user) return null;

  const esciBtn = (
    <button
      className="text-sm font-semibold text-traffic-red hover:underline"
      onClick={async () => {
        await supabase.auth.signOut();
        router.push("/");
      }}
    >
      ↩ Esci
    </button>
  );

  // Barra SEMPRE visibile: le tre tendine (piani · servizi extra · promo onboarding).
  const topBar = (
    <BarraTendine
      voci={[
        {
          id: "piani",
          icona: "🚀",
          label: "Con cosa vuoi partire",
          tone: "verde",
          content: (
            <>
              <PianoSelector scelto={pianoScelto} attivo={activePlan} onScegli={scegliPiano} />
              <PagamentoFinale ownerId={user.id} scelto={pianoScelto} attivo={activePlan} bioOk={bioOk} />
            </>
          ),
        },
        {
          id: "extra",
          icona: "🎁",
          label: "Aggiungi servizi extra",
          tone: "giallo",
          content: <ServiziExtra showPrices plan={activePlan} onAcquista={acquistaServizio} />,
        },
      ]}
      promo={<PromoOnboarding />}
    />
  );

  const alert =
    sospeso && activePlan !== sospeso.plan ? (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-display text-lg text-green-800">⏳ Hai un acquisto da completare</div>
          <p className="text-sm text-green-900/75">
            Piano {PLAN_MAP[sospeso.plan as Plan]?.label ?? sospeso.plan}
            {sospeso.extras.length ? ` + ${sospeso.extras.length} servizio/i extra` : ""} — pagamento non concluso.
          </p>
        </div>
        <div className="flex flex-none gap-2">
          <button type="button" onClick={riprendiAcquisto} className="btn-lime justify-center text-sm">
            Riprendi e paga
          </button>
          <button
            type="button"
            onClick={() => {
              pulisciAcquistoSospeso();
              setSospeso(null);
            }}
            className="btn-ghost justify-center text-sm"
          >
            Annulla
          </button>
        </div>
      </div>
    ) : null;

  // pallino accanto a «Magazzino»: livello peggiore tra i prodotti gestiti
  const magLiv = peggiorLivello(magVoci.map((v) => livelloMagazzino(v.giacenza, v.iniziale)));
  const magDot = magLiv ? COLORE_MAGAZZINO[magLiv] : null;

  const panels: DashPanel[] = [
    {
      id: "start",
      section: "Lavoro",
      icon: "start",
      label: "Da dove parto",
      content: (
        <StartPanel
          ownerId={user.id}
          activePlan={activePlan}
          onScegli={scegliPiano}
          onAttivaOnboarding={() => acquistaServizio("onboarding")}
          onbAttivo={onbAttivo}
        />
      ),
    },
    {
      id: "prod",
      section: "Lavoro",
      icon: "prodotti",
      label: "Prodotti & semaforo",
      content: (
        <>
          {/* Spedizione in cima all'area prodotti: così l'azienda imposta le spese
              di consegna mentre carica il catalogo, senza doverle cercare altrove. */}
          <SpedizioneConfigCard />
          <SchedaMappaCard ownerId={user.id} plan={pianoScelto} activePlan={activePlan} vista="prodotti" />
        </>
      ),
    },
    {
      id: "cat",
      section: "Lavoro",
      icon: "catalogo",
      label: "Esperienze in azienda",
      content: <EsperienzeCard ownerId={user.id} plan={pianoScelto} />,
    },
    {
      id: "dati",
      section: "Lavoro",
      icon: "dati",
      label: "Dati & posizione",
      content: (
        <>
          <SchedaMappaCard ownerId={user.id} plan={pianoScelto} activePlan={activePlan} vista="dati" />
          <DatiFatturazioneForm ownerId={user.id} />
        </>
      ),
    },
    {
      id: "bio",
      section: "Lavoro",
      icon: "bio",
      label: "La mia certificazione bio",
      content: <SezioneBio ownerId={user.id} onValid={setBioOk} />,
    },
    {
      id: "prev",
      section: "Lavoro",
      icon: "anteprima",
      label: "Anteprima & link",
      content: <AnteprimaScheda ownerId={user.id} />,
    },
    {
      id: "msg",
      section: "Attività",
      icon: "messaggi",
      label: "Messaggi",
      content: <MessaggiCard ownerId={user.id} />,
    },
    {
      id: "pren",
      section: "Attività",
      icon: "prenotazioni",
      label: "Prenotazioni",
      badge: conte.prenotazioni || null,
      content: <PrenotazioniCard ownerId={user.id} />,
    },
    {
      id: "ord",
      section: "Attività",
      icon: "ordini",
      label: "Ordini shop",
      badge: conte.ordini || null,
      content: <OrdiniShopRicevuti />,
    },
    {
      id: "mag",
      section: "Attività",
      icon: "magazzino",
      label: "Magazzino",
      dot: magDot,
      content: <MagazzinoCard voci={magVoci} />,
    },
    {
      id: "stat",
      section: "Attività",
      icon: "statistiche",
      label: "Statistiche",
      content: <StatisticheCard ownerId={user.id} plan={pianoScelto} />,
    },
    {
      id: "pay",
      section: "Attività",
      icon: "incassi",
      label: "Incassi & Stripe",
      content: <PagamentiCard ownerId={user.id} plan={pianoScelto} />,
    },
    {
      id: "extra",
      section: "Servizi extra",
      icon: "extra",
      tone: "giallo",
      label: "Servizi extra",
      content: (
        <section className="card p-5 md:p-6">
          <h2 className="font-display text-2xl text-green-800">Servizi extra</h2>
          <p className="mt-1 text-sm text-green-900/70">
            Potenzia la tua attività. Guarda la demo di ciascun servizio.
          </p>
          <div className="mt-4">
            <ServiziExtra showPrices plan={activePlan} onAcquista={acquistaServizio} />
          </div>
          <div className="mt-6">
            <GoldPromoBanner portale="BioFido" plan={pianoScelto} />
          </div>
        </section>
      ),
    },
    {
      id: "onb",
      section: "Servizi extra",
      icon: "onboarding",
      tone: "giallo",
      label: "Ci pensiamo noi",
      content: <OnboardingCard />,
    },
    {
      id: "spedizioni",
      section: "Servizi extra",
      icon: "spedizioni",
      tone: "giallo",
      label: "Spedizioni",
      content: (
        <>
          <SpedizioneConfigCard />
          <ServizioInAttivazione
            titolo="Corriere integrato"
            testo="Le tariffe di spedizione qui sopra le incassi tu e servono a coprire il corriere. Presto potrai anche prenotare il ritiro e stampare le etichette di spedizione direttamente da qui (corriere integrato). Stiamo collegando il servizio."
          />
        </>
      ),
    },
    {
      id: "attivi",
      section: "Servizi extra",
      icon: "attivi",
      tone: "giallo",
      label: "Servizi attivi",
      content: <ServiziAttivi />,
    },
  ];

  return (
    <>
      <DashboardShell
        title="La tua dashboard · Area aziende"
        header={esciBtn}
        topBar={topBar}
        alert={alert}
        panels={panels}
        defaultPanel="start"
      />
      {popupPag && (
        <PurchasePopup
          plan={popupPag.plan}
          period={popupPag.period}
          planLabel={PLAN_MAP[popupPag.plan].label}
          planPrice={
            popupPag.period === "annual"
              ? PLAN_MAP[popupPag.plan].annualPrice
              : PLAN_MAP[popupPag.plan].monthlyPrice
          }
          activePlan={activePlan}
          onClose={() => setPopupPag(null)}
        />
      )}
      <PromoTimer plan={activePlan} />
    </>
  );
}

/* ============================ PANNELLO "DA DOVE PARTO" ============================ */
function StartPanel({
  ownerId,
  activePlan,
  onScegli,
  onAttivaOnboarding,
  onbAttivo,
}: {
  ownerId: string;
  activePlan: Plan;
  onScegli: (p: Plan, per: "monthly" | "annual") => void;
  onAttivaOnboarding: () => void;
  onbAttivo: boolean;
}) {
  return (
    <div className="space-y-4">
      <DashboardPlanHeader plan={activePlan} />
      <LegendaPianiSlider
        activePlan={activePlan}
        onScegli={(p) => onScegli(p, "annual")}
        onAttivaOnboarding={onAttivaOnboarding}
        onboardingAttivo={onbAttivo}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => vaiAlPannello("prod")}
          className="rounded-2xl border-2 border-[#9fcd6f] bg-[#f4faec] p-5 text-left transition hover:-translate-y-0.5"
        >
          <div className="text-3xl">🚦</div>
          <div className="mt-1 font-display text-lg text-[#235d12]">Carica prodotti e spese di spedizione</div>
          <div className="text-xs text-[#5c7a3f]">Semaforo della filiera + tariffe di consegna.</div>
        </button>
        <button
          type="button"
          onClick={() => vaiAlPannello("cat")}
          className="rounded-2xl border-2 border-badge-yellow bg-[#fdf7e6] p-5 text-left transition hover:-translate-y-0.5"
        >
          <div className="text-3xl">✨</div>
          <div className="mt-1 font-display text-lg text-[#7a5b00]">Carica le ESPERIENZE in azienda prenotabili</div>
          <div className="text-xs text-[#8a6f2e]">Visite, laboratori, degustazioni prenotabili.</div>
        </button>
      </div>
      <ProdottiCaricatiMini ownerId={ownerId} />
    </div>
  );
}

/** Mini-elenco dei prodotti già caricati (sotto le cornici di "Da dove parto"). */
function ProdottiCaricatiMini({ ownerId }: { ownerId: string }) {
  const [prods, setProds] = useState<Product[] | null>(null);
  const [sede, setSede] = useState<{ lat: number; lon: number } | null>(null);
  useEffect(() => {
    loadMyBusiness(ownerId)
      .then((b) => {
        setProds(b?.products ?? []);
        if (b) setSede({ lat: b.lat, lon: b.lon });
      })
      .catch(() => setProds([]));
  }, [ownerId]);
  if (prods === null) return null;
  return (
    <section className="card p-5">
      <h3 className="font-display text-lg text-green-800">Tutto ciò che hai già caricato</h3>
      {prods.length === 0 ? (
        <p className="mt-2 text-sm text-green-900/65">
          Ancora niente: usa le due cornici qui sopra per aggiungere il tuo primo prodotto o servizio.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {prods.map((p, i) => {
            const conSem = p.mostraSemaforo !== false && (p.ingredients?.length ?? 0) > 0;
            const sem = SEMAFORO[calcolaImpronta(sede, p.ingredients ?? []).level];
            return (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-[#e3eed7] bg-white px-4 py-2">
                <span
                  className="h-3 w-3 flex-none rounded-full"
                  style={{ background: conSem ? sem.colore : "#cdd5dc" }}
                />
                <span className="truncate font-semibold text-green-800">{p.name || "(senza nome)"}</span>
                {!conSem && <span className="ml-auto text-xs text-amber-700">no semaforo</span>}
              </div>
            );
          })}
        </div>
      )}
      <button onClick={() => vaiAlPannello("prod")} className="btn-ghost mt-3 text-sm">
        Gestisci prodotti e servizi →
      </button>
    </section>
  );
}

/** Casella promozionale dell'onboarding nella barra superiore (al posto di "Tutti i servizi"). */
function PromoOnboarding() {
  return (
    <button
      type="button"
      onClick={() => vaiAlPannello("onb")}
      className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border-2 border-badge-yellow bg-[#fffbe9] px-3 py-2 text-left transition hover:bg-[#fff6da]"
    >
      <span className="text-2xl">🪄</span>
      <span className="min-w-0">
        <span className="block font-display text-sm text-[#7a5b00]">Non ho tempo per un sito</span>
        <span className="block truncate text-xs text-[#8a6f2e]">Ci pensiamo noi · guarda la demo</span>
      </span>
    </button>
  );
}

/** Placeholder per un servizio non ancora attivo (es. Spedizioni, Fatture ricevute). */
function ServizioInAttivazione({ titolo, testo }: { titolo: string; testo: string }) {
  return (
    <section className="card p-5 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl text-green-800">{titolo}</h2>
        <span className="rounded-full bg-badge-yellow/40 px-3 py-1 text-xs font-bold text-[#7a5b00]">
          Servizio in attivazione
        </span>
      </div>
      <p className="mt-3 rounded-xl bg-[#fffbe9] p-4 text-sm text-green-900/80">{testo}</p>
    </section>
  );
}

/** Pannello "Servizi attivi": cosa l'azienda ha già attivato. */
function ServiziAttivi() {
  const [extras, setExtras] = useState<string[] | null>(null);
  const [statoOnb, setStatoOnb] = useState<string | null>(null);
  useEffect(() => {
    getMyExtras()
      .then(setExtras)
      .catch(() => setExtras([]));
    getStatoOnboarding()
      .then((s) => setStatoOnb((s as { stato?: string } | null)?.stato ?? null))
      .catch(() => {});
  }, []);
  const LABEL: Record<string, string> = {
    onboarding: "Ci pensiamo noi (onboarding negozio)",
    report: "Report della filiera",
    badge: "Badge ECO-VISA",
  };
  return (
    <section className="card p-5 md:p-6">
      <h2 className="font-display text-2xl text-green-800">Servizi attivi</h2>
      <p className="mt-1 text-sm text-green-900/70">Cosa hai già attivato sul tuo account.</p>
      {extras === null ? (
        <p className="mt-4 text-sm text-green-900/60">Caricamento…</p>
      ) : extras.length === 0 ? (
        <p className="mt-4 rounded-xl bg-leaf/40 p-4 text-sm text-green-900/70">
          Non hai ancora attivato servizi extra. Li trovi nella sezione «Servizi extra».
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {extras.map((k) => (
            <div key={k} className="flex items-center gap-3 rounded-xl border border-[#cfe3b4] bg-leaf/30 p-3">
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white">
                ✓
              </span>
              <div className="flex-1">
                <div className="font-semibold text-green-800">{LABEL[k] ?? k}</div>
                {k === "onboarding" && statoOnb && (
                  <div className="text-xs text-green-900/60">Stato: {statoOnb}</div>
                )}
              </div>
              <span className="text-xs font-semibold text-green-700">Attivo</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------- SCELTA PIANO (senza pagamento) ------------------- */
function PianoSelector({
  scelto,
  attivo,
  onScegli,
}: {
  scelto: Plan;
  attivo: Plan;
  onScegli: (p: Plan, per: "monthly" | "annual") => void;
}) {
  return (
    <section className="card mt-6 p-6">
      <div className="text-xs font-bold uppercase tracking-wide text-lime-500">
        1 · Scegli il piano
      </div>
      <h2 className="font-display text-2xl text-green-800">Con cosa vuoi partire</h2>
      <p className="mt-1 text-sm text-green-900/70">
        Seleziona un piano per sbloccare i campi qui sotto.{" "}
        <strong>Paghi solo alla fine</strong>, dopo aver compilato tutto.
      </p>
      <div className="mt-4">
        <PianiAbbonamento currentPlan={attivo} selectedPlan={scelto} onSelect={onScegli} />
      </div>
    </section>
  );
}

/* ------------------- PAGAMENTO FINALE ------------------- */
function PagamentoFinale({
  ownerId,
  scelto,
  attivo,
  bioOk,
}: {
  ownerId: string;
  scelto: Plan;
  attivo: Plan;
  bioOk: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [fatturazioneOk, setFatturazioneOk] = useState(false);
  // Precompilo la fatturazione coi dati della scheda mappa (nome, indirizzo, città)
  const [prefill, setPrefill] = useState<PrefillFatturazione | undefined>(undefined);
  useEffect(() => {
    loadMyBusiness(ownerId).then((b) => {
      if (b)
        setPrefill({
          ragione_sociale: b.name,
          indirizzo: b.address,
          citta: b.city,
        });
    });
  }, [ownerId]);

  const giaAttivo = attivo === scelto && attivo !== "free";

  async function paga(per: "monthly" | "annual") {
    setBusy(true);
    setMsg(null);
    try {
      await startCheckout(scelto, per, getExtraScelti());
    } catch (e) {
      setBusy(false);
      setMsg((e as Error).message);
    }
  }

  async function gestisci() {
    setBusy(true);
    setMsg(null);
    try {
      await openCustomerPortal();
    } catch (e) {
      setBusy(false);
      setMsg((e as Error).message);
    }
  }

  if (scelto === "free") {
    return (
      <section className="card mt-6 p-6 text-center">
        <h2 className="font-display text-2xl text-green-800">Tutto pronto, gratis</h2>
        <p className="mt-1 text-sm text-green-900/70">
          Con il piano Free la tua scheda è già pubblica sulla mappa. Niente da pagare.
        </p>
      </section>
    );
  }

  if (giaAttivo) {
    return (
      <section className="card mt-6 p-6 text-center">
        <h2 className="font-display text-2xl text-green-800">
          Piano {PLAN_MAP[scelto].label} attivo ✅
        </h2>
        <p className="mt-1 text-sm text-green-900/70">
          Il tuo abbonamento è attivo: tutte le funzioni del piano sono disponibili.
        </p>
        <button
          className="btn-ghost mt-4"
          onClick={gestisci}
          disabled={busy}
        >
          {busy ? "Apro…" : "Gestisci abbonamento (fatture, carta, disdetta)"}
        </button>
        <p className="mt-2 text-xs text-green-900/55">
          Per non rinnovare, disdici almeno 10 giorni prima della scadenza.
        </p>
        {msg && <p className="mt-2 text-sm font-semibold text-traffic-red">{msg}</p>}
      </section>
    );
  }

  const mensile = PLAN_MAP[scelto].monthlyPrice;
  const annuale = PLAN_MAP[scelto].annualPrice;
  const mensileSuAnno = mensile * 12;

  return (
    <section className="mt-6 space-y-4">
      {/* dati di fatturazione: obbligatori per i piani a pagamento */}
      <DatiFatturazioneForm ownerId={ownerId} onValid={setFatturazioneOk} prefill={prefill} />

      <div className="panel-dark rounded-2xl p-6 text-center">
        <h2 className="font-display text-2xl">Hai compilato la tua scheda?</h2>
        <p className="mt-1 text-[#eaf7d8]">
          Attiva il piano {PLAN_MAP[scelto].label} per pubblicare tutto e ricevere prenotazioni.
        </p>
        {billingEnabled ? (
          <>
            <div className="mt-4 flex flex-col items-center gap-2">
              {/* Annuale: opzione consigliata (principale) */}
              <button
                className="btn-lime w-full max-w-sm justify-center"
                onClick={() => paga("annual")}
                disabled={busy || !fatturazioneOk || !bioOk}
              >
                {busy ? "Apro il pagamento…" : `Vai al pagamento — ${annuale} € + IVA/anno`}
              </button>
              {/* Mensile: tonalità diversa, con equivalente annuale tra parentesi */}
              <button
                className="w-full max-w-sm justify-center rounded-full border border-white/40 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-50"
                onClick={() => paga("monthly")}
                disabled={busy || !fatturazioneOk || !bioOk}
              >
                Oppure mensile — {mensile} € + IVA/mese{" "}
                <span className="font-normal text-[#eaf7d8]">({mensileSuAnno} € all&apos;anno)</span>
              </button>
              <p className="text-xs text-[#cfe3b4]">
                Con l&apos;annuale risparmi: {mensileSuAnno - annuale} € all&apos;anno.
              </p>
              <p className="mx-auto max-w-sm text-xs text-[#cfe3b4]">
                Rinnovo automatico: il mensile ogni mese, l&apos;annuale ogni anno. Puoi
                disdire quando vuoi; <strong>per non rinnovare, annulla almeno 10 giorni
                prima della scadenza</strong>.
              </p>
            </div>
            {!bioOk && (
              <p className="mt-3 text-sm text-badge-yellow">
                Salva prima la tua certificazione biologica qui sopra.
              </p>
            )}
            {bioOk && !fatturazioneOk && (
              <p className="mt-3 text-sm text-badge-yellow">
                Salva prima i dati di fatturazione qui sopra.
              </p>
            )}
          </>
        ) : (
          <p className="mt-3 text-sm text-[#eaf7d8]">Pagamenti non ancora attivi.</p>
        )}
        {msg && <p className="mt-3 text-sm font-semibold text-badge-yellow">{msg}</p>}
      </div>
    </section>
  );
}

/* ------------------- GUIDA / SCHEDA CLIENTE ------------------- */
function GuidaCard({ ownerId, plan }: { ownerId: string; plan: Plan }) {
  const [done, setDone] = useState<Record<PassoKey, boolean>>({
    scheda: false,
    notifiche: false,
    esperienze: false,
    pagamenti: false,
    prodotti: false,
  });

  useEffect(() => {
    (async () => {
      const [biz, exps, acc, push] = await Promise.all([
        loadMyBusiness(ownerId),
        listMyExperiences(ownerId),
        supabase
          .from("stripe_accounts")
          .select("charges_enabled")
          .eq("user_id", ownerId)
          .maybeSingle(),
        supabase.from("push_subscriptions").select("id").eq("user_id", ownerId).limit(1),
      ]);
      setDone({
        scheda: !!biz,
        notifiche: (push.data?.length ?? 0) > 0,
        esperienze: exps.length > 0,
        pagamenti: !!(acc.data as { charges_enabled?: boolean } | null)?.charges_enabled,
        prodotti: !!(biz?.products && biz.products.length > 0),
      });
    })();
  }, [ownerId]);

  const next = nextPlan(plan);
  const bloccate = FUNZIONI.filter((f) => !planAllows(plan, f.minPlan));

  // nascondi il passo notifiche finché il push non è configurato (chiave VAPID)
  const passi = PASSI.filter((p) => p.key !== "notifiche" || pushConfigured);

  // avanzamento: solo sui passi disponibili nel piano
  const disponibili = passi.filter((p) => planAllows(plan, p.minPlan));
  const fatti = disponibili.filter((p) => done[p.key]).length;
  const totale = disponibili.length;
  const perc = totale ? Math.round((fatti / totale) * 100) : 0;
  const completo = fatti === totale && totale > 0;

  function vai(anchor: string) {
    document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="card mt-6 p-6">
      <div className="text-xs font-bold uppercase tracking-wide text-lime-500">
        Inizia da qui
      </div>
      <h2 className="font-display text-2xl text-green-800">
        La tua scheda · piano{" "}
        <span className="text-green-700">{PLAN_MAP[plan].label}</span>
      </h2>
      <p className="mt-1 text-sm text-green-900/70">
        Segui i passi per mettere in vetrina la tua attività. Le funzioni del tuo
        piano sono <strong>attive</strong>; le altre si sbloccano facilmente
        passando al piano successivo.
      </p>

      {/* indicatore di completamento */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-sm font-semibold text-green-800">
          <span>
            {completo ? "Scheda completa! 🎉" : `${fatti} di ${totale} passi completati`}
          </span>
          <span className="text-green-900/60">{perc}%</span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-leaf">
          <div
            className="h-full rounded-full bg-lime-500 transition-all"
            style={{ width: `${perc}%` }}
          />
        </div>
      </div>

      {/* passi operativi */}
      <ol className="mt-4 space-y-2">
        {passi.map((p, i) => {
          const ok = planAllows(plan, p.minPlan);
          const fatto = ok && done[p.key];
          return (
            <li
              key={i}
              className={`flex items-start gap-3 rounded-xl border p-3 ${
                fatto
                  ? "border-[#cfe3b4] bg-leaf/50"
                  : ok
                  ? "border-[#e3eed7] bg-white"
                  : "border-dashed border-[#dfe7d2] bg-leaf/30"
              }`}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-bold ${
                  fatto
                    ? "bg-traffic-green text-white"
                    : ok
                    ? "bg-green-700 text-white"
                    : "bg-[#cfe0bb] text-green-900/50"
                }`}
              >
                {fatto ? "✓" : ok ? i + 1 : "🔒"}
              </span>
              <div className="min-w-0 flex-1">
                <div
                  className={`font-semibold ${
                    fatto ? "text-green-700" : ok ? "text-green-800" : "text-green-900/55"
                  }`}
                >
                  {p.titolo}
                </div>
                <div className="text-xs text-green-900/60">{p.descr}</div>
                {ok ? (
                  <button
                    onClick={() => vai(p.anchor)}
                    className="mt-1 text-xs font-bold text-green-700 hover:text-lime-500"
                  >
                    {fatto ? "Rivedi" : "→ Vai"}
                  </button>
                ) : (
                  <span className="mt-1 inline-block text-xs font-semibold text-green-900/55">
                    Disponibile col piano {PLAN_MAP[p.minPlan].label} ·{" "}
                    <Link href="/abbonamenti" className="text-green-700 hover:text-lime-500">
                      sblocca
                    </Link>
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* tutte le funzioni: attive vs da sbloccare */}
      <h3 className="mt-6 font-display text-xl text-green-800">
        Le funzioni del tuo piano
      </h3>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {FUNZIONI.map((f) => {
          const ok = planAllows(plan, f.minPlan);
          return (
            <li key={f.label} className="flex items-start gap-2 text-sm">
              <span className={ok ? "text-lime-500" : "text-green-900/35"}>
                {ok ? "✓" : "🔒"}
              </span>
              <span className={ok ? "text-green-900/90" : "text-green-900/55"}>
                <span className="font-semibold">{f.label}</span>
                {!ok && (
                  <span className="ml-1 rounded-full bg-leaf px-2 py-0.5 text-[10px] font-bold text-green-700">
                    con {PLAN_MAP[f.minPlan].label}
                  </span>
                )}
                <span className="block text-xs text-green-900/55">{f.descr}</span>
              </span>
            </li>
          );
        })}
      </ul>

      {/* invito all'upgrade */}
      {next && bloccate.length > 0 && (
        <div className="panel-dark mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-5">
          <div>
            <div className="font-display text-xl">
              Sblocca {bloccate.length} funzioni in più
            </div>
            <div className="text-sm text-[#eaf7d8]">
              Passa al piano {PLAN_MAP[next].label} e fai crescere la tua vetrina.
            </div>
          </div>
          <Link href="/abbonamenti" className="btn-lime whitespace-nowrap">
            Vedi i piani
          </Link>
        </div>
      )}
    </section>
  );
}

/* ------------------- SCHEDA SULLA MAPPA (produttore) ------------------- */
const BOZZA_SCHEDA = "biofido_scheda_bozza";

function SchedaMappaCard({
  ownerId,
  plan,
  activePlan,
  vista = "tutto",
}: {
  ownerId: string;
  plan: Plan;
  activePlan: Plan;
  /** "dati" = solo anagrafica/posizione · "prodotti" = solo prodotti · "tutto" = entrambi */
  vista?: "dati" | "prodotti" | "tutto";
}) {
  const [existing, setExisting] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<CategoryId>("agricola");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [coord, setCoord] = useState<{ lat: number; lon: number } | null>(null);
  const [editProd, setEditProd] = useState<number | "new" | null>(null);
  const [pubblicaEcovisa, setPubblicaEcovisa] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const b = await loadMyBusiness(ownerId);
    setExisting(b);
    if (b) {
      setName(b.name);
      setCategory(b.category);
      setCity(b.city);
      setAddress(b.address ?? "");
      setDescription(b.description ?? "");
      setWebsite(b.website ?? "");
      setPhone(b.phone ?? "");
      setProducts(b.products ?? []);
      setPubblicaEcovisa(b.pubblicaEcovisa === true);
      setCoord({ lat: b.lat, lon: b.lon });
    } else {
      // prima scheda: eredito la preferenza «pubblica su ECO-VISA» scelta in
      // fase di registrazione (salvata nei metadati dell'utente).
      supabase.auth.getUser().then(({ data: { user } }) => {
        const pref = (user?.user_metadata as { pubblica_ecovisa?: boolean } | undefined)
          ?.pubblica_ecovisa;
        if (pref !== undefined) setPubblicaEcovisa(pref);
      });
      // Nessuna scheda salvata: ripristina l'eventuale bozza locale (anti perdita-dati)
      try {
        const raw = window.localStorage.getItem(BOZZA_SCHEDA);
        if (raw) {
          const d = JSON.parse(raw);
          if (d.name) setName(d.name);
          if (d.category) setCategory(d.category);
          if (d.city) setCity(d.city);
          if (d.address) setAddress(d.address);
          if (d.description) setDescription(d.description);
          if (d.website) setWebsite(d.website);
          if (d.phone) setPhone(d.phone);
          if (Array.isArray(d.products)) setProducts(d.products);
          if (d.coord) setCoord(d.coord);
        }
      } catch {}
    }
    setLoading(false);
  }, [ownerId]);

  useEffect(() => {
    load();
  }, [load]);

  // Salva una bozza locale finché la scheda non è registrata sul DB
  useEffect(() => {
    if (loading || existing) return;
    try {
      window.localStorage.setItem(
        BOZZA_SCHEDA,
        JSON.stringify({ name, category, city, address, description, website, phone, products, coord }),
      );
    } catch {}
  }, [loading, existing, name, category, city, address, description, website, phone, products, coord]);

  async function save() {
    if (!name.trim()) {
      setMsg("Inserisci il nome dell'attività.");
      return;
    }
    if (!coord) {
      setMsg("Scegli la città dall'elenco dei suggerimenti.");
      return;
    }
    setSaving(true);
    setMsg(null);
    const { error } = await saveMyBusiness(
      ownerId,
      {
        name,
        category,
        plan: activePlan,
        city,
        lat: coord.lat,
        lon: coord.lon,
        address,
        description,
        website,
        phone,
        products: products.filter((p) => p.name.trim()),
        pubblicaEcovisa,
      },
      existing?.id,
    );
    setSaving(false);
    if (error) {
      setMsg("Errore: " + error);
      return;
    }
    try {
      window.localStorage.removeItem(BOZZA_SCHEDA);
    } catch {}
    setMsg("Scheda salvata ✓ — la tua attività è sulla mappa.");
    load();
  }

  return (
    <section id="scheda" className="card mt-6 p-6 scroll-mt-20">
      {vista !== "prodotti" && (
        <>
          <h2 className="font-display text-2xl text-green-800">
            La tua scheda sulla mappa
          </h2>
          <p className="mt-1 text-sm text-green-900/70">
            Questi dati appaiono sul segnaposto BioFido. La posizione si ricava dalla
            città. Il piano <strong>{PLAN_MAP[plan].label}</strong> determina la
            visibilità e cosa puoi mostrare.
          </p>
        </>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-green-900/60">Caricamento…</p>
      ) : (
        <>
          {vista !== "prodotti" && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="label">Nome attività *</span>
              <input className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Cascina Verde — Ortaggi Bio" />
            </label>
            <label className="block">
              <span className="label">Categoria *</span>
              <select className="field mt-1" value={category} onChange={(e) => setCategory(e.target.value as CategoryId)}>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Città (sede) *</span>
              <div className="mt-1">
                <ComuneAutocomplete
                  value={city}
                  onSelect={(c) => {
                    setCity(c.nome);
                    setCoord({ lat: c.lat, lon: c.lon });
                  }}
                  placeholder="Es. gen… → Genova (GE) — Liguria"
                />
              </div>
            </label>
            <label className="block">
              <span className="label">Indirizzo</span>
              <div className="mt-1">
                <IndirizzoAutocomplete
                  value={address}
                  onChange={setAddress}
                  onSelect={(s) => {
                    setCoord({ lat: s.lat, lon: s.lon });
                    setMsg("📍 Indirizzo trovato: segnaposto posizionato. Rifinisci col pin e salva.");
                  }}
                  placeholder="Scrivi la via: es. Via Roma 1, Torino"
                />
              </div>
              <p className="mt-1 text-xs text-green-900/55">
                Scrivi la via e <strong>scegli il suggerimento</strong>; poi, se serve,
                <strong> trascina il pin</strong> sulla mappa per il punto esatto.
              </p>
            </label>
            {coord && (
              <div className="md:col-span-2">
                <span className="label">📍 Posiziona il segnaposto esatto</span>
                <div className="mt-1 overflow-hidden rounded-2xl border border-[#e3eed7]">
                  <MappaPicker
                    lat={coord.lat}
                    lon={coord.lon}
                    onChange={(la, lo) => setCoord({ lat: la, lon: lo })}
                  />
                </div>
                <p className="mt-1 text-xs text-green-900/55">
                  Tocca la mappa o trascina il pin sulla posizione precisa della tua
                  azienda, poi salva.
                </p>
              </div>
            )}
            {PLAN_MAP[plan].showWebsite && (
              <label className="block md:col-span-2">
                <span className="label">Sito web</span>
                <input className="field mt-1" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="www.esempio.it" />
              </label>
            )}
            {PLAN_MAP[plan].showDescription && (
              <label className="block md:col-span-2">
                <span className="label">Descrizione</span>
                <textarea className="field mt-1" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Racconta la tua attività…" />
              </label>
            )}
            {!PLAN_MAP[plan].showDescription && (
              <p className="rounded-xl bg-leaf/50 p-3 text-xs text-green-900/70 md:col-span-2">
                Con <strong>Free</strong> la tua azienda compare come segnaposto sulla mappa
                (posizione, tipo e nome). Foto, descrizione e sito web si sbloccano dal piano{" "}
                <strong>Silver</strong>.
              </p>
            )}
          </div>
          )}

          {vista === "prodotti" && !existing && (
            <p className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              Prima crea la tua scheda in <strong>«Dati aziendali e posizione»</strong>:
              senza città/posizione i prodotti non possono essere pubblicati sulla mappa.
            </p>
          )}

          {vista === "dati" ? null : PLAN_MAP[plan].showProducts ? (
            (() => {
              const limite = Math.min(PLAN_MAP[plan].maxProducts, 100);
              const pieno = products.length >= limite;
              return (
                <div className="mt-5 rounded-2xl border-2 border-dashed border-[#cfe3b4] bg-leaf/40 p-5">
                  <h3 className="font-display text-xl text-green-800">
                    I tuoi prodotti / semafori della filiera{" "}
                    <span className="text-sm font-normal text-green-900/60">
                      ({products.length}/{limite} · piano {PLAN_MAP[plan].label})
                    </span>
                  </h3>
                  <p className="mt-1 text-xs text-green-900/65">
                    🛒 I prodotti sono in <strong>vetrina</strong>: si vedono sull&apos;app
                    ma l&apos;acquisto avviene <strong>direttamente in azienda</strong>. Per
                    ciò che si <strong>prenota</strong> (visite, laboratori, degustazioni)
                    usa la sezione <strong>Esperienze</strong> qui sotto.
                  </p>
                  <div className="mt-3 space-y-2">
                    {products.map((p, i) => {
                      const conSemaforo = p.mostraSemaforo !== false;
                      const haSemaforoEcovisa = conSemaforo && (p.ingredients?.length ?? 0) > 0;
                      const sem = SEMAFORO[calcolaImpronta(coord, p.ingredients ?? []).level];
                      return (
                        <div key={i}>
                        <div
                          className="flex items-center justify-between gap-3 rounded-xl border border-[#e3eed7] bg-white px-4 py-2"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className="h-3 w-3 flex-none rounded-full"
                              style={{ background: conSemaforo ? sem.colore : "#cdd5dc" }}
                              title={conSemaforo ? sem.testo : "Semaforo disattivato (solo vetrina)"}
                            />
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-green-800">
                                {p.name || "(senza nome)"}
                              </div>
                              <div className="truncate text-xs text-green-900/60">
                                {p.price ? `${p.price} ${p.unit ?? ""}` : "—"}
                                {p.ingredients?.length ? ` · ${p.ingredients.length} materie prime` : ""}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-none items-center gap-3">
                            <button className="text-xs font-bold text-green-700 hover:underline" onClick={() => setEditProd(i)}>
                              Modifica
                            </button>
                            <button
                              className="text-xs font-bold text-traffic-red hover:underline"
                              onClick={() => setProducts((prev) => prev.filter((_, idx) => idx !== i))}
                            >
                              Elimina
                            </button>
                          </div>
                        </div>
                        {!haSemaforoEcovisa && (
                          <p className="mt-1 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
                            🚦 Ricorda: per essere pubblicato anche su <strong>ECO-VISA</strong>,
                            questo prodotto deve avere il <strong>semaforo della filiera</strong>
                            {" "}(materie prime con la loro origine).
                          </p>
                        )}
                        </div>
                      );
                    })}
                  </div>
                  <button
                    className="btn-lime mt-3 text-sm"
                    onClick={() => setEditProd("new")}
                    disabled={pieno}
                  >
                    + Aggiungi prodotto
                  </button>
                  {pieno && (
                    <span className="ml-3 text-xs font-semibold text-green-900/60">
                      Limite del piano {PLAN_MAP[plan].label} raggiunto.
                    </span>
                  )}

                  {editProd !== null && (
                    <ProdottoEditor
                      sede={coord}
                      ownerId={ownerId}
                      plan={plan}
                      initial={editProd === "new" ? undefined : products[editProd]}
                      onClose={() => setEditProd(null)}
                      onSave={(prod) => {
                        setProducts((prev) =>
                          editProd === "new"
                            ? [...prev, prod]
                            : prev.map((x, idx) => (idx === editProd ? prod : x)),
                        );
                        setEditProd(null);
                      }}
                    />
                  )}
                </div>
              );
            })()
          ) : (
            <p className="mt-3 text-xs text-green-900/55">
              I prodotti con foto e prezzi si sbloccano dai piani Silver (fino a
              10) e Gold (fino a 100).
            </p>
          )}

          {vista !== "dati" && (() => {
            const haSemaforo = (p: Product) =>
              p.mostraSemaforo !== false && (p.ingredients?.length ?? 0) > 0;
            // prodotti che il cliente ha scelto di pubblicare su ECO-VISA (col semaforo)
            const suEcovisa = products.filter((p) => p.pubblicaEcovisa && haSemaforo(p)).length;
            const tot = products.length;
            return (
              <div className="mt-5 rounded-2xl border-2 border-[#cfe0b0] bg-white p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-6 w-6 flex-none accent-green-700"
                    checked={pubblicaEcovisa}
                    onChange={(e) => setPubblicaEcovisa(e.target.checked)}
                  />
                  <span>
                    <span className="flex items-center gap-2">
                      <span className="rounded-md bg-green-700 px-2 py-0.5 font-display text-sm font-bold tracking-wide text-white">
                        ECO-VISA
                      </span>
                      <span className="font-display text-base font-bold uppercase tracking-wide text-green-800">
                        Pubblica la tua scheda anche su ECO-VISA
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-green-900/70">
                      La tua scheda azienda comparirà anche sul portale ECO-VISA. Lì appaiono solo
                      i prodotti che hai scelto di pubblicare con la spunta{" "}
                      <strong>«Pubblica anche su ECO-VISA»</strong> nella scheda di ogni prodotto.
                      Su ECO-VISA il <strong>semaforo è obbligatorio</strong>: i prodotti senza
                      restano solo su BioFido.
                    </span>
                    {pubblicaEcovisa && (
                      <span
                        className={`mt-2 block rounded-lg px-3 py-2 text-xs font-semibold ${
                          suEcovisa > 0 ? "bg-leaf/60 text-green-800" : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        {tot === 0
                          ? "Aggiungi prodotti col semaforo e spunta «Pubblica anche su ECO-VISA» nella loro scheda."
                          : suEcovisa > 0
                            ? `✅ ${suEcovisa} ${suEcovisa === 1 ? "prodotto verrà pubblicato" : "prodotti verranno pubblicati"} su ECO-VISA.`
                            : "⚠️ Nessun prodotto è ancora marcato per ECO-VISA. Apri la scheda di un prodotto col semaforo e spunta «Pubblica anche su ECO-VISA»."}
                      </span>
                    )}
                  </span>
                </label>
              </div>
            );
          })()}

          {vista !== "dati" && (
            <CrossPortalBanner
              attiva={pubblicaEcovisa}
              url={`${URL_ECOVISA}/azienda/${businessSlug(name || "")}/`}
              altroPortale="ECO-VISA"
            />
          )}

          <div className="mt-4 flex items-center gap-3">
            <button className="btn-lime" onClick={save} disabled={saving || !name.trim()}>
              {saving
                ? "Salvataggio…"
                : vista === "prodotti"
                  ? "Salva prodotti"
                  : existing
                    ? "Aggiorna scheda"
                    : "Pubblica sulla mappa"}
            </button>
            {msg && <span className="text-sm font-semibold text-green-700">{msg}</span>}
          </div>
        </>
      )}
    </section>
  );
}

/* ------------------- PAGAMENTI / STRIPE CONNECT (produttore) ------------------- */
function PagamentiCard({ ownerId, plan }: { ownerId: string; plan: Plan }) {
  const [ready, setReady] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    // valore rapido dal DB, poi conferma autorevole da Stripe
    supabase
      .from("stripe_accounts")
      .select("charges_enabled")
      .eq("user_id", ownerId)
      .maybeSingle()
      .then(({ data }) => setReady(Boolean((data as { charges_enabled?: boolean })?.charges_enabled)));
    refreshConnectStatus().then((live) => {
      if (live !== null) setReady(live);
    });
  }, [ownerId]);

  // i pagamenti delle prenotazioni servono solo ai piani che possono vendere
  if (!billingEnabled || !PLAN_MAP[plan].canSell) return null;

  async function collega() {
    setBusy(true);
    setMsg(null);
    try {
      await startOnboarding();
    } catch (e) {
      setBusy(false);
      setMsg((e as Error).message);
    }
  }

  return (
    <section id="pagamenti" className="card mt-6 p-6 scroll-mt-20">
      <h2 className="font-display text-2xl text-green-800">Pagamenti</h2>
      <p className="mt-1 text-sm text-green-900/70">
        Collega Stripe per ricevere online i pagamenti delle prenotazioni
        confermate. BioFido trattiene solo la commissione del tuo piano; il resto
        arriva sul tuo conto.
      </p>
      {ready ? (
        <p className="mt-4 rounded-xl bg-leaf px-4 py-3 text-sm font-semibold text-green-800">
          Account Stripe collegato ✅ — puoi ricevere pagamenti.
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className="btn-lime" onClick={collega} disabled={busy}>
            {busy ? "Apro Stripe…" : "Collega Stripe"}
          </button>
          {msg && <span className="text-sm font-semibold text-traffic-red">{msg}</span>}
        </div>
      )}
    </section>
  );
}

/* ------------------- ESPERIENZE (produttore) ------------------- */
function EsperienzeCard({ ownerId, plan }: { ownerId: string; plan: Plan }) {
  const [items, setItems] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [titolo, setTitolo] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [prezzo, setPrezzo] = useState("");
  const [durata, setDurata] = useState("");
  const [maxP, setMaxP] = useState("10");
  // agenda: giorni della settimana in cui si svolge (1=lun…7=dom) + orario fisso
  const [giorni, setGiorni] = useState<number[]>([]);
  const [orario, setOrario] = useState("");
  // fasce orarie prenotabili (max 3) + capienza per fascia
  const [fasce, setFasce] = useState<Fascia[]>([]);
  const [capienza, setCapienza] = useState("");
  const addFascia = () =>
    setFasce((prev) => (prev.length >= 3 ? prev : [...prev, { inizio: "", fine: "" }]));
  const setFascia = (i: number, patch: Partial<Fascia>) =>
    setFasce((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const rmFascia = (i: number) => setFasce((prev) => prev.filter((_, idx) => idx !== i));
  // foto + lingue dell'esperienza (italiano sempre incluso)
  const [immagine, setImmagine] = useState("");
  const [lingue, setLingue] = useState<string[]>(["it"]);
  const [caricando, setCaricando] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const toggleGiorno = (g: number) =>
    setGiorni((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g].sort()));
  const toggleLingua = (code: string) =>
    setLingue((prev) => {
      const cur = new Set(prev.length ? prev : ["it"]);
      if (code === "it") return [...cur]; // l'italiano è sempre incluso
      if (cur.has(code)) cur.delete(code);
      else if (cur.size < 8) cur.add(code);
      return [...cur];
    });

  const load = useCallback(async () => {
    setLoading(true);
    setItems(await listMyExperiences(ownerId));
    setLoading(false);
  }, [ownerId]);

  useEffect(() => {
    load();
  }, [load]);

  const info = PLAN_MAP[plan];
  const atLimit = items.length >= info.maxEvents;

  function reset() {
    setEditId(null);
    setTitolo("");
    setDescrizione("");
    setPrezzo("");
    setDurata("");
    setMaxP("10");
    setGiorni([]);
    setOrario("");
    setFasce([]);
    setCapienza("");
    setImmagine("");
    setLingue(["it"]);
    setMsg(null);
  }

  function modifica(e: Experience) {
    setEditId(e.id);
    setTitolo(e.titolo);
    setDescrizione(e.descrizione ?? "");
    setPrezzo((e.prezzoCents / 100).toLocaleString("it-IT", { minimumFractionDigits: 2 }));
    setDurata(e.durataMin != null ? String(e.durataMin) : "");
    setMaxP(String(e.maxPersone));
    setGiorni(e.giorniSettimana ?? []);
    setOrario(e.orario ?? "");
    setFasce(e.fasceOrarie ?? []);
    setCapienza(e.capienzaSlot != null ? String(e.capienzaSlot) : "");
    setImmagine(e.immagine ?? "");
    setLingue(e.lingue && e.lingue.length ? e.lingue : ["it"]);
    setMsg(null);
    if (typeof document !== "undefined")
      document.getElementById("esperienze")?.scrollIntoView({ behavior: "smooth" });
  }

  async function salva() {
    const cents = euroToCents(prezzo);
    if (!titolo.trim() || cents == null) {
      setMsg("Inserisci almeno titolo e prezzo.");
      return;
    }
    // solo le fasce con inizio+fine compilati
    const fasceValide = fasce.filter((f) => f.inizio && f.fine);
    setSaving(true);
    setMsg(null);
    const dati = {
      titolo,
      descrizione,
      prezzoCents: cents,
      durataMin: durata ? Number(durata) : undefined,
      maxPersone: Math.max(1, Number(maxP) || 1),
      attiva: true,
      giorniSettimana: giorni.length ? giorni : undefined,
      orario: orario || undefined,
      fasceOrarie: fasceValide.length ? fasceValide : undefined,
      capienzaSlot: capienza ? Math.max(1, Number(capienza) || 1) : undefined,
      lingue: lingue.length ? lingue : undefined,
      immagine: immagine || undefined,
    };
    const { error } = editId
      ? await updateExperience(editId, dati)
      : await createExperience(ownerId, dati);
    setSaving(false);
    if (error) {
      setMsg("Errore: " + error);
      return;
    }
    reset();
    load();
  }

  return (
    <section id="esperienze" className="card mt-6 p-6 scroll-mt-20">
      <h2 className="font-display text-2xl text-green-800">
        Le tue esperienze / attività prenotabili
      </h2>
      <p className="mt-1 text-sm text-green-900/70">
        Visite in azienda, laboratori didattici, degustazioni e corsi: queste{" "}
        <strong>si prenotano dall&apos;app</strong>. La prenotazione arriva nella tua
        bacheca <em>in attesa</em> e si attiva <strong>solo dopo la tua approvazione</strong>;
        il cliente <strong>paga in anticipo via Stripe</strong>. Commissione BioFido{" "}
        {Math.round(info.commissionRate * 100)}% sulle prenotazioni confermate.
      </p>

      {!info.canSell ? (
        <div className="mt-4 rounded-xl bg-leaf p-4 text-sm text-green-900/80">
          Le esperienze prenotabili sono disponibili dai piani{" "}
          <strong>Silver</strong> e <strong>Gold</strong>.{" "}
          <Link href="/abbonamenti" className="font-bold text-green-700 hover:text-lime-500">
            Scopri gli abbonamenti →
          </Link>
        </div>
      ) : (
        <>
          {loading ? (
            <p className="mt-4 text-sm text-green-900/60">Caricamento…</p>
          ) : (
            items.length > 0 && (
              <ul className="mt-4 space-y-2">
                {items.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-[#e3eed7] bg-white p-3"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      {e.immagine ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.immagine} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-leaf text-[10px] text-green-900/40">
                          no foto
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold text-green-800">{e.titolo}</div>
                        <div className="text-sm text-green-900/60">
                          {euroCents(e.prezzoCents)}
                          {e.durataMin ? ` · ${e.durataMin} min` : ""} · max {e.maxPersone}
                        </div>
                        {(e.giorniSettimana?.length || e.orario) && (
                          <div className="text-xs font-semibold text-green-700">
                            🗓{" "}
                            {e.giorniSettimana?.length
                              ? e.giorniSettimana
                                  .map((g) => ["", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"][g])
                                  .join(", ")
                              : "ogni giorno"}
                            {e.orario ? ` · ${e.orario}` : ""}
                          </div>
                        )}
                        {e.lingue?.length ? (
                          <div className="text-[11px] text-green-900/55">
                            {e.lingue.join(", ").toUpperCase()}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <button
                        className="text-xs font-bold text-green-700 hover:underline"
                        onClick={() => modifica(e)}
                      >
                        Modifica
                      </button>
                      <button
                        className="text-xs font-bold text-traffic-red hover:underline"
                        onClick={async () => {
                          if (confirm("Eliminare questa esperienza?")) {
                            await deleteExperience(e.id);
                            load();
                          }
                        }}
                      >
                        Elimina
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}

          {atLimit && !editId ? (
            <p className="mt-4 rounded-xl bg-leaf p-3 text-sm font-semibold text-green-800">
              Hai raggiunto il limite di esperienze del piano {info.label}. Passa
              a Gold per esperienze illimitate.
            </p>
          ) : (
            <div className="mt-5 rounded-2xl border-2 border-dashed border-[#cfe3b4] bg-leaf/40 p-5">
              <h3 className="font-display text-xl text-green-800">
                {editId ? "Modifica l'esperienza" : "Aggiungi un'esperienza"}
              </h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="label">Titolo *</span>
                  <input
                    className="field mt-1"
                    value={titolo}
                    onChange={(e) => setTitolo(e.target.value)}
                    placeholder="Es. Visita guidata in cantina"
                  />
                </label>
                <label className="block">
                  <span className="label">Prezzo a persona (€) *</span>
                  <ImportoInput value={prezzo} onChange={setPrezzo} placeholder="€ 15,00" />
                </label>
                <label className="block">
                  <span className="label">Durata (min)</span>
                  <input
                    className="field mt-1"
                    value={durata}
                    onChange={(e) => setDurata(e.target.value)}
                    placeholder="90"
                  />
                </label>
                <label className="block">
                  <span className="label">Max persone</span>
                  <input
                    type="number"
                    min={1}
                    className="field mt-1"
                    value={maxP}
                    onChange={(e) => setMaxP(e.target.value)}
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="label">Descrizione</span>
                  <textarea
                    className="field mt-1"
                    rows={2}
                    value={descrizione}
                    onChange={(e) => setDescrizione(e.target.value)}
                  />
                </label>

                {/* foto dell'esperienza */}
                <div className="md:col-span-2">
                  <span className="label">Foto dell&apos;esperienza</span>
                  <div className="mt-1 flex items-center gap-3">
                    {immagine ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={immagine} alt="" className="h-16 w-16 rounded-lg object-cover" />
                    ) : (
                      <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-leaf text-[10px] text-green-900/50">
                        nessuna
                      </span>
                    )}
                    <label className="btn-ghost cursor-pointer text-sm">
                      {caricando ? "Carico…" : immagine ? "Cambia foto" : "📷 Carica foto"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setCaricando(true);
                          try {
                            setImmagine(await caricaImmagineCatalogo(ownerId, f));
                          } catch (er) {
                            setMsg((er as Error).message);
                          } finally {
                            setCaricando(false);
                          }
                        }}
                      />
                    </label>
                    {immagine && (
                      <button
                        type="button"
                        className="text-xs font-semibold text-traffic-red"
                        onClick={() => setImmagine("")}
                      >
                        Rimuovi
                      </button>
                    )}
                  </div>
                </div>

                {/* lingue dell'attività (per i turisti) */}
                <div className="md:col-span-2">
                  <span className="label">Lingue dell&apos;attività</span>
                  <span className="mt-0.5 block text-[11px] text-green-900/55">
                    L&apos;italiano è sempre incluso. Aggiungi fino a 8 lingue.
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {LINGUE_SERVIZIO.map((l) => {
                      const attive = lingue.length ? lingue : ["it"];
                      const on = attive.includes(l.code);
                      return (
                        <button
                          key={l.code}
                          type="button"
                          onClick={() => toggleLingua(l.code)}
                          className={`rounded-full px-3 py-1 text-sm font-bold ${
                            on ? "bg-green-700 text-white" : "bg-leaf text-green-800 hover:bg-[#dcebc8]"
                          } ${l.code === "it" ? "opacity-90" : ""}`}
                        >
                          {l.flag} {l.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* AGENDA: quando si svolge l'attività (facoltativo). Se specificato,
                    il cliente potrà prenotare solo questi giorni / a quest'orario. */}
                <div className="md:col-span-2">
                  <span className="label">Giorni in cui si svolge <span className="font-normal text-green-900/50">(facoltativo)</span></span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {[
                      [1, "Lun"], [2, "Mar"], [3, "Mer"], [4, "Gio"],
                      [5, "Ven"], [6, "Sab"], [7, "Dom"],
                    ].map(([g, lab]) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => toggleGiorno(g as number)}
                        className={`rounded-full px-3 py-1 text-sm font-bold ${
                          giorni.includes(g as number)
                            ? "bg-green-700 text-white"
                            : "bg-leaf text-green-800 hover:bg-[#dcebc8]"
                        }`}
                      >
                        {lab}
                      </button>
                    ))}
                  </div>
                  <span className="mt-1 block text-[11px] text-green-900/55">
                    Lascia vuoto se l&apos;attività si può fare in qualsiasi giorno.
                  </span>
                </div>
                <label className="block">
                  <span className="label">Orario <span className="font-normal text-green-900/50">(facoltativo)</span></span>
                  <input
                    type="time"
                    className="field mt-1"
                    value={orario}
                    onChange={(e) => setOrario(e.target.value)}
                  />
                  <span className="mt-1 block text-[11px] text-green-900/55">
                    Se lo imposti, il cliente prenoterà a quest&apos;ora (può chiederti una
                    modifica nel messaggio).
                  </span>
                </label>

                {/* FASCE ORARIE prenotabili (max 3) + capienza per fascia: se impostate,
                    il cliente sceglie una fascia e quelle piene spariscono per quella data. */}
                <div className="md:col-span-2 rounded-xl border border-[#e3eed7] bg-leaf/20 p-3">
                  <span className="label">
                    Fasce orarie prenotabili <span className="font-normal text-green-900/50">(facoltative, max 3)</span>
                  </span>
                  <div className="mt-2 space-y-2">
                    {fasce.map((f, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="time"
                          className="field flex-1"
                          value={f.inizio}
                          onChange={(e) => setFascia(i, { inizio: e.target.value })}
                        />
                        <span className="text-green-900/50">–</span>
                        <input
                          type="time"
                          className="field flex-1"
                          value={f.fine}
                          onChange={(e) => setFascia(i, { fine: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => rmFascia(i)}
                          aria-label="Rimuovi fascia"
                          className="flex h-9 w-9 flex-none items-center justify-center rounded-lg text-xl text-traffic-red hover:bg-white"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  {fasce.length < 3 && (
                    <button
                      type="button"
                      onClick={addFascia}
                      className="mt-2 text-sm font-bold text-green-700 hover:text-lime-600"
                    >
                      + Aggiungi fascia
                    </button>
                  )}
                  <label className="mt-3 block">
                    <span className="label">
                      Capienza per fascia <span className="font-normal text-green-900/50">(posti per data + fascia)</span>
                    </span>
                    <input
                      type="number"
                      min={1}
                      className="field mt-1 w-40"
                      value={capienza}
                      onChange={(e) => setCapienza(e.target.value)}
                      placeholder={`es. ${maxP || "10"}`}
                    />
                    <span className="mt-1 block text-[11px] text-green-900/55">
                      Quando una fascia è al completo per una certa data, il cliente non può più
                      prenotarla. Vuoto = usa il massimo persone qui sopra.
                    </span>
                  </label>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button className="btn-lime" onClick={salva} disabled={saving || !titolo.trim()}>
                  {saving ? "Salvataggio…" : editId ? "Aggiorna esperienza" : "Salva esperienza"}
                </button>
                {editId && (
                  <button type="button" className="btn-ghost text-sm" onClick={reset}>
                    Annulla
                  </button>
                )}
                {msg && (
                  <span className="text-sm font-semibold text-traffic-red">{msg}</span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

/* ------------------- PRENOTAZIONI RICEVUTE (produttore) ------------------- */
function StatoBadge({ stato }: { stato: BookingStatus }) {
  const color =
    stato === "confermata"
      ? "bg-traffic-green text-white"
      : stato === "rifiutata" || stato === "annullata"
      ? "bg-[#c9d3da] text-[#33414a]"
      : "bg-badge-yellow text-green-900";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${color}`}>
      {STATO_LABEL[stato]}
    </span>
  );
}

/* ------------------- MESSAGGI (inbox unica) ------------------- */
type InboxItem =
  | { kind: "contatto"; date: string; c: Contatto }
  | { kind: "prenotazione"; date: string; b: Booking };

function MessaggiCard({ ownerId }: { ownerId: string }) {
  const [contatti, setContatti] = useState<Contatto[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [c, b] = await Promise.all([listContatti(ownerId), listMyBookings(ownerId)]);
    setContatti(c);
    setBookings(b);
    setLoading(false);
  }, [ownerId]);

  useEffect(() => {
    load();
  }, [load]);

  const items: InboxItem[] = useMemo(() => {
    const a: InboxItem[] = contatti.map((c) => ({ kind: "contatto", date: c.createdAt ?? "", c }));
    const d: InboxItem[] = bookings.map((b) => ({ kind: "prenotazione", date: b.createdAt ?? "", b }));
    return [...a, ...d].sort((x, y) => (y.date > x.date ? 1 : x.date > y.date ? -1 : 0));
  }, [contatti, bookings]);

  const nuovi = contatti.filter((c) => c.stato === "nuovo").length;

  async function gestito(id: string, val: boolean) {
    await setContattoGestito(id, val);
    load();
  }

  return (
    <section id="messaggi" className="card mt-6 p-6 scroll-mt-20">
      <h2 className="font-display text-2xl text-green-800">
        Messaggi
        {nuovi > 0 && (
          <span className="ml-2 rounded-full bg-traffic-green px-2 py-0.5 align-middle text-xs font-bold text-white">
            {nuovi} nuovi
          </span>
        )}
      </h2>
      <p className="mt-1 text-sm text-green-900/70">
        Tutto ciò che ti arriva dai clienti: messaggi di «Contatta l&apos;azienda» e
        richieste di prenotazione, dal più recente.
      </p>

      <NotificheToggle />
      <SmsNotificheToggle ownerId={ownerId} />

      {loading ? (
        <p className="mt-4 text-sm text-green-900/60">Caricamento…</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-green-900/70">
          Nessun messaggio per ora. Quando un cliente ti scrive o prenota, lo trovi qui
          (e ti arriva anche per email).
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((it) =>
            it.kind === "contatto" ? (
              <li
                key={`c-${it.c.id}`}
                className={`rounded-2xl border p-4 ${
                  it.c.stato === "nuovo" ? "border-traffic-green bg-leaf/40" : "border-[#e3eed7] bg-white"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-lime-600">
                      ✉️ Messaggio
                    </div>
                    <div className="font-semibold text-green-800">{it.c.nomeCliente}</div>
                    <div className="text-xs text-green-900/60">{it.c.emailCliente}</div>
                  </div>
                  {it.c.createdAt && (
                    <div className="text-[11px] text-green-900/50">
                      {it.c.createdAt.slice(0, 10)}
                    </div>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-green-900/85">
                  {it.c.messaggio}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <a
                    href={`mailto:${it.c.emailCliente}?subject=${encodeURIComponent(
                      "Risposta al tuo messaggio",
                    )}`}
                    className="rounded-full bg-green-700 px-3 py-1 text-xs font-bold text-white hover:bg-green-800"
                  >
                    ✉️ Rispondi via email
                  </a>
                  <button
                    className="rounded-full border border-green-600 px-3 py-1 text-xs font-bold text-green-700"
                    onClick={() => gestito(it.c.id, it.c.stato !== "gestito")}
                  >
                    {it.c.stato === "gestito" ? "↩︎ Riapri" : "✓ Segna gestito"}
                  </button>
                </div>
              </li>
            ) : (
              <li key={`b-${it.b.id}`} className="rounded-2xl border border-[#e3eed7] bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-badge-yellow">
                      🗓️ Prenotazione
                    </div>
                    <div className="font-semibold text-green-800">
                      {it.b.titolo ?? "Esperienza"} · {it.b.persone} persone
                    </div>
                    <div className="text-xs text-green-900/60">
                      {it.b.clienteNome} · {it.b.clienteEmail}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-green-800">{euroCents(it.b.totaleCents)}</div>
                    <StatoBadge stato={it.b.stato} />
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    className="rounded-full border border-green-600 px-3 py-1 text-xs font-bold text-green-700"
                    onClick={() => setChatOpen(chatOpen === it.b.id ? null : it.b.id)}
                  >
                    💬 Chat
                  </button>
                  <a
                    href="#prenotazioni"
                    className="text-xs font-bold text-green-700 hover:underline"
                  >
                    Gestisci (conferma/rifiuta) →
                  </a>
                </div>
                {chatOpen === it.b.id && (
                  <ChatPrenotazione prenotazioneId={it.b.id} mittente="azienda" />
                )}
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
}

function PrenotazioniCard({ ownerId }: { ownerId: string }) {
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setItems(await listMyBookings(ownerId));
    setLoading(false);
  }, [ownerId]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(b: Booking, stato: BookingStatus) {
    try {
      if (stato === "confermata") {
        // se il cliente ha già pagato (fondi bloccati) catturo l'autorizzazione;
        // altrimenti marco solo confermata (vecchio flusso, paga dopo).
        if (b.paymentStatus === "autorizzata") await captureBooking(b.id);
        else await setBookingStatus(b.id, "confermata");
      } else {
        // rifiuto: se c'era un'autorizzazione la annullo (libera i fondi), poi marco rifiutata
        if (b.paymentStatus === "autorizzata") await cancelBooking(b.id);
        else await setBookingStatus(b.id, "rifiutata");
      }
    } catch (e) {
      alert((e as Error).message);
      return;
    }
    // notifica in-app al cliente collegato
    await sendMessage(
      b.id,
      "azienda",
      stato === "confermata"
        ? "La tua prenotazione è stata confermata ✅. A presto!"
        : "Spiacenti, non possiamo accettare questa richiesta. Scrivici pure per trovare un'alternativa.",
    );
    load();
  }

  return (
    <section id="prenotazioni" className="card mt-6 p-6 scroll-mt-20">
      <h2 className="font-display text-2xl text-green-800">Prenotazioni ricevute</h2>
      {loading ? (
        <p className="mt-3 text-sm text-green-900/60">Caricamento…</p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-sm text-green-900/70">
          Nessuna richiesta per ora. Pubblica un&apos;esperienza qui sopra per
          riceverne.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((b) => (
            <li key={b.id} className="rounded-2xl border border-[#e3eed7] bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-green-800">
                    {b.titolo ?? "Esperienza"} · {b.persone} persone
                  </div>
                  {numeroPrenotazioneFmt(b) && (
                    <div className="text-xs font-semibold text-green-900/70">
                      Prenotazione {numeroPrenotazioneFmt(b)} · {dataOraPrenotazione(b.createdAt)}
                    </div>
                  )}
                  <div className="text-xs text-green-900/60">
                    Data richiesta: {b.dataRichiesta}
                  </div>
                  {/* scheda cliente per fattura/contatto */}
                  <div className="mt-2 rounded-xl bg-leaf/40 p-2.5 text-xs text-green-900/85">
                    <div className="font-bold uppercase tracking-wide text-green-700">
                      Dati cliente
                    </div>
                    <div className="mt-0.5 space-y-0.5">
                      <div>👤 {b.clienteNome || "—"}</div>
                      <div>✉️ {b.clienteEmail || "—"}</div>
                      <div>📞 {b.clienteTel || "— (non fornito)"}</div>
                      <div>
                        🧾 {b.clientePiva ? "CF azienda" : "CF"}:{" "}
                        {b.clienteCf || "— (non fornito)"}
                      </div>
                      <div>📍 {b.clienteIndirizzo || "— (non fornito)"}</div>
                      {b.clientePiva && (
                        <div>
                          🏢 {b.clienteRagioneSociale || "Azienda"} — P.IVA {b.clientePiva}
                        </div>
                      )}
                      <div>
                        📄 Fattura elettronica:{" "}
                        {b.clientePec
                          ? `PEC ${b.clientePec}`
                          : `SDI ${b.clienteSdi || "0000000"}`}
                      </div>
                    </div>
                  </div>
                  {b.note && (
                    <div className="mt-1 text-xs italic text-green-900/55">“{b.note}”</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-display text-lg text-green-800">
                    {euroCents(b.totaleCents)}
                  </div>
                  <div className="text-[11px] text-green-900/55">
                    commissione {euroCents(b.commissioneCents)}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatoBadge stato={b.stato} />
                {b.paymentStatus === "pagata" && (
                  <span className="rounded-full bg-traffic-green px-2 py-0.5 text-[11px] font-bold text-white">
                    Pagata ✅
                  </span>
                )}
                {b.paymentStatus === "autorizzata" && (
                  <span className="rounded-full bg-badge-yellow px-2 py-0.5 text-[11px] font-bold text-[#7a5a00]">
                    💳 Pagata · fondi bloccati
                  </span>
                )}
                {b.stato === "in_attesa" && (
                  <>
                    <button
                      className="rounded-full bg-traffic-green px-3 py-1 text-xs font-bold text-white"
                      onClick={() => act(b, "confermata")}
                    >
                      {b.paymentStatus === "autorizzata" ? "Approva e incassa" : "Conferma"}
                    </button>
                    <button
                      className="rounded-full border border-traffic-red px-3 py-1 text-xs font-bold text-traffic-red"
                      onClick={() => act(b, "rifiutata")}
                    >
                      Rifiuta
                    </button>
                  </>
                )}
                <button
                  className="rounded-full border border-green-600 px-3 py-1 text-xs font-bold text-green-700"
                  onClick={() => setChatOpen(chatOpen === b.id ? null : b.id)}
                >
                  💬 Messaggi
                </button>
              </div>
              {chatOpen === b.id && (
                <ChatPrenotazione prenotazioneId={b.id} mittente="azienda" />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
