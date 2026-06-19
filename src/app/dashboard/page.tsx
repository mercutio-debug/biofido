"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import { PianiAbbonamento } from "@/components/Abbonamenti";
import { PLAN_MAP, CATEGORIES, type Plan, type CategoryId } from "@/lib/categories";
import {
  loadMyBusiness,
  saveMyBusiness,
  type Business,
  type Product,
} from "@/lib/biofido-data";
import { ComuneAutocomplete } from "@/components/ComuneAutocomplete";
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
import { DatiFatturazioneForm, type PrefillFatturazione } from "@/components/DatiFatturazioneForm";
import { SezioneBio } from "@/components/SezioneBio";
import { SchedaServizi } from "@/components/SchedaServizi";
import { CatalogoCard } from "@/components/CatalogoCard";
import { startOnboarding, refreshConnectStatus } from "@/lib/connect";
import {
  listMyExperiences,
  createExperience,
  deleteExperience,
  listMyBookings,
  setBookingStatus,
  sendMessage,
  euroCents,
  STATO_LABEL,
  type Experience,
  type Booking,
  type BookingStatus,
} from "@/lib/bookings";
import { ChatPrenotazione } from "@/components/ChatPrenotazione";
import { NotificheToggle } from "@/components/NotificheToggle";
import { pushConfigured } from "@/lib/push";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  // piano effettivo (pagato/admin) e piano che l'azienda sta configurando
  const [activePlan, setActivePlan] = useState<Plan>("free");
  const [pianoScelto, setPianoScelto] = useState<Plan>("free");
  const [periodo, setPeriodo] = useState<"monthly" | "annual">("annual");
  // BioFido è riservato alle aziende bio: la certificazione è obbligatoria
  const [bioOk, setBioOk] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/accedi");
      return;
    }
    setLoading(false);
  }, [authLoading, user, router]);

  // piano attivo + inizializzazione del piano scelto per la configurazione
  useEffect(() => {
    if (!user) return;
    getMyPlan().then((p) => {
      setActivePlan(p);
      const saved = window.localStorage.getItem("biofido_piano_scelto") as Plan | null;
      setPianoScelto(p !== "free" ? p : saved && saved in PLAN_MAP ? saved : "free");
    });
  }, [user]);

  function scegliPiano(p: Plan, per: "monthly" | "annual") {
    setPianoScelto(p);
    setPeriodo(per);
    window.localStorage.setItem("biofido_piano_scelto", p);
  }

  if (authLoading || loading) {
    return <div className="mx-auto max-w-4xl px-4 py-16 text-green-900/70">Caricamento…</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-lime-500">
            Area aziende
          </div>
          <h1 className="title-pangea text-3xl text-green-700 md:text-4xl">
            La tua dashboard
          </h1>
        </div>
        <button
          className="btn-ghost text-sm"
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/");
          }}
        >
          Esci
        </button>
      </div>

      <PianoSelector scelto={pianoScelto} attivo={activePlan} onScegli={scegliPiano} />

      <SchedaServizi piano={pianoScelto} attivo={activePlan} />

      {user && <GuidaCard ownerId={user.id} plan={pianoScelto} />}

      <div id="notifiche">
        <NotificheToggle />
      </div>

      {user && (
        <>
          <SezioneBio ownerId={user.id} onValid={setBioOk} />
          <SchedaMappaCard ownerId={user.id} plan={pianoScelto} activePlan={activePlan} />
          <CatalogoCard ownerId={user.id} gold={pianoScelto === "gold"} />
          <PagamentiCard ownerId={user.id} plan={pianoScelto} />
          <EsperienzeCard ownerId={user.id} plan={pianoScelto} />
          <PrenotazioniCard ownerId={user.id} />
          <PagamentoFinale ownerId={user.id} scelto={pianoScelto} attivo={activePlan} bioOk={bioOk} />
        </>
      )}
    </div>
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
  // Precompilo la fatturazione coi dati della scheda mappa (nome + città)
  const [prefill, setPrefill] = useState<PrefillFatturazione | undefined>(undefined);
  useEffect(() => {
    loadMyBusiness(ownerId).then((b) => {
      if (b) setPrefill({ ragione_sociale: b.name, citta: b.city });
    });
  }, [ownerId]);

  const giaAttivo = attivo === scelto && attivo !== "free";

  async function paga(per: "monthly" | "annual") {
    setBusy(true);
    setMsg(null);
    try {
      await startCheckout(scelto, per);
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
}: {
  ownerId: string;
  plan: Plan;
  activePlan: Plan;
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
      setCoord({ lat: b.lat, lon: b.lon });
    } else {
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
      <h2 className="font-display text-2xl text-green-800">
        La tua scheda sulla mappa
      </h2>
      <p className="mt-1 text-sm text-green-900/70">
        Questi dati appaiono sul segnaposto BioFido. La posizione si ricava dalla
        città. Il piano <strong>{PLAN_MAP[plan].label}</strong> determina la
        visibilità e cosa puoi mostrare.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-green-900/60">Caricamento…</p>
      ) : (
        <>
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
              <input className="field mt-1" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Via dei Campi 12" />
            </label>
            <label className="block">
              <span className="label">Telefono</span>
              <input className="field mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label className="block md:col-span-2">
              <span className="label">Sito web</span>
              <input className="field mt-1" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="www.esempio.it" />
            </label>
            <label className="block md:col-span-2">
              <span className="label">Descrizione</span>
              <textarea className="field mt-1" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Racconta la tua attività…" />
            </label>
          </div>

          {PLAN_MAP[plan].showProducts ? (
            (() => {
              const limite = Math.min(PLAN_MAP[plan].maxProducts, 100);
              const pieno = products.length >= limite;
              return (
                <div className="mt-5 rounded-2xl border-2 border-dashed border-[#cfe3b4] bg-leaf/40 p-5">
                  <h3 className="font-display text-xl text-green-800">
                    I tuoi prodotti{" "}
                    <span className="text-sm font-normal text-green-900/60">
                      ({products.length}/{limite} · piano {PLAN_MAP[plan].label})
                    </span>
                  </h3>
                  <div className="mt-3 space-y-2">
                    {products.map((p, i) => {
                      const sem = SEMAFORO[calcolaImpronta(coord, p.ingredients ?? []).level];
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between gap-3 rounded-xl border border-[#e3eed7] bg-white px-4 py-2"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="h-3 w-3 flex-none rounded-full" style={{ background: sem.colore }} title={sem.testo} />
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

          <div className="mt-4 flex items-center gap-3">
            <button className="btn-lime" onClick={save} disabled={saving || !name.trim()}>
              {saving ? "Salvataggio…" : existing ? "Aggiorna scheda" : "Pubblica sulla mappa"}
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
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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

  async function add() {
    const cents = Math.round(parseFloat(prezzo.replace(",", ".")) * 100);
    if (!titolo.trim() || isNaN(cents)) {
      setMsg("Inserisci almeno titolo e prezzo.");
      return;
    }
    setSaving(true);
    setMsg(null);
    const { error } = await createExperience(ownerId, {
      titolo,
      descrizione,
      prezzoCents: cents,
      durataMin: durata ? Number(durata) : undefined,
      maxPersone: Math.max(1, Number(maxP) || 1),
      attiva: true,
    });
    setSaving(false);
    if (error) {
      setMsg("Errore: " + error);
      return;
    }
    setTitolo("");
    setDescrizione("");
    setPrezzo("");
    setDurata("");
    setMaxP("10");
    load();
  }

  return (
    <section id="esperienze" className="card mt-6 p-6 scroll-mt-20">
      <h2 className="font-display text-2xl text-green-800">Le tue esperienze</h2>
      <p className="mt-1 text-sm text-green-900/70">
        Visite, degustazioni e corsi prenotabili dal portale. Commissione BioFido{" "}
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
                    className="flex items-center justify-between rounded-xl border border-[#e3eed7] bg-white px-4 py-2"
                  >
                    <span className="min-w-0">
                      <span className="font-semibold text-green-800">{e.titolo}</span>
                      <span className="ml-2 text-sm text-green-900/60">
                        {euroCents(e.prezzoCents)}
                        {e.durataMin ? ` · ${e.durataMin} min` : ""} · max {e.maxPersone}
                      </span>
                    </span>
                    <button
                      className="text-xs font-bold text-traffic-red hover:underline"
                      onClick={async () => {
                        await deleteExperience(e.id);
                        load();
                      }}
                    >
                      Elimina
                    </button>
                  </li>
                ))}
              </ul>
            )
          )}

          {atLimit ? (
            <p className="mt-4 rounded-xl bg-leaf p-3 text-sm font-semibold text-green-800">
              Hai raggiunto il limite di esperienze del piano {info.label}. Passa
              a Gold per esperienze illimitate.
            </p>
          ) : (
            <div className="mt-5 rounded-2xl border-2 border-dashed border-[#cfe3b4] bg-leaf/40 p-5">
              <h3 className="font-display text-xl text-green-800">
                Aggiungi un&apos;esperienza
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
                  <input
                    className="field mt-1"
                    value={prezzo}
                    onChange={(e) => setPrezzo(e.target.value)}
                    placeholder="15"
                  />
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
              </div>
              <button
                className="btn-lime mt-4"
                onClick={add}
                disabled={saving || !titolo.trim()}
              >
                {saving ? "Salvataggio…" : "Salva esperienza"}
              </button>
              {msg && (
                <span className="ml-3 text-sm font-semibold text-traffic-red">{msg}</span>
              )}
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

  async function act(id: string, stato: BookingStatus) {
    await setBookingStatus(id, stato);
    // notifica in-app al cliente collegato
    await sendMessage(
      id,
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
                  <div className="text-xs text-green-900/60">
                    {b.clienteNome} · {b.clienteEmail}
                    {b.clienteTel ? ` · ${b.clienteTel}` : ""}
                  </div>
                  <div className="text-xs text-green-900/60">
                    Data richiesta: {b.dataRichiesta}
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
                {b.stato === "in_attesa" && (
                  <>
                    <button
                      className="rounded-full bg-traffic-green px-3 py-1 text-xs font-bold text-white"
                      onClick={() => act(b.id, "confermata")}
                    >
                      Conferma
                    </button>
                    <button
                      className="rounded-full border border-traffic-red px-3 py-1 text-xs font-bold text-traffic-red"
                      onClick={() => act(b.id, "rifiutata")}
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
