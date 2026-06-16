"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import { computeFootprint } from "@/lib/footprint";
import { Semaforo } from "@/components/Semaforo";
import { PianiAbbonamento } from "@/components/Abbonamenti";
import { PLAN_MAP, CATEGORIES, type Plan, type CategoryId } from "@/lib/categories";
import {
  loadMyBusiness,
  saveMyBusiness,
  type Business,
  type Product,
} from "@/lib/biofido-data";
import { geocode } from "@/lib/geo";
import { billingEnabled, startCheckout } from "@/lib/billing";
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

type Azienda = {
  id: string;
  nome: string;
  piva: string | null;
  citta_sede: string | null;
  sito_web: string | null;
};
type Stabilimento = { id: string; nome: string | null; citta: string };
type Ingrediente = { id?: string; nome: string; origine: string };
type Prodotto = {
  id: string;
  nome: string;
  categoria: string | null;
  stabilimento_citta: string;
  ingredienti: Ingrediente[];
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [azienda, setAzienda] = useState<Azienda | null>(null);
  const [stabilimenti, setStabilimenti] = useState<Stabilimento[]>([]);
  const [prodotti, setProdotti] = useState<Prodotto[]>([]);

  // ---- caricamento dati ----
  const loadAll = useCallback(async () => {
    setLoading(true);
    const { data: az } = await supabase.from("aziende").select("*").limit(1);
    const a = (az?.[0] as Azienda) ?? null;
    setAzienda(a);
    if (a) {
      const { data: st } = await supabase
        .from("stabilimenti")
        .select("*")
        .eq("azienda_id", a.id)
        .order("created_at");
      setStabilimenti((st as Stabilimento[]) ?? []);

      const { data: pr } = await supabase
        .from("prodotti")
        .select("*")
        .eq("azienda_id", a.id)
        .order("created_at");
      const prods = (pr as Omit<Prodotto, "ingredienti">[]) ?? [];
      const withIngr: Prodotto[] = [];
      for (const p of prods) {
        const { data: ing } = await supabase
          .from("ingredienti")
          .select("*")
          .eq("prodotto_id", p.id)
          .order("created_at");
        withIngr.push({ ...p, ingredienti: (ing as Ingrediente[]) ?? [] });
      }
      setProdotti(withIngr);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/accedi");
      return;
    }
    loadAll();
  }, [authLoading, user, router, loadAll]);

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

      <NotificheToggle />

      <AnagraficaCard
        azienda={azienda}
        initialNome={(user?.user_metadata as { nome?: string })?.nome}
        onSaved={loadAll}
      />

      <AbbonamentoCard />

      {user && (
        <>
          <SchedaMappaCard ownerId={user.id} />
          <EsperienzeCard ownerId={user.id} />
          <PrenotazioniCard ownerId={user.id} />
        </>
      )}

      {azienda && (
        <>
          <StabilimentiCard
            aziendaId={azienda.id}
            stabilimenti={stabilimenti}
            onChange={loadAll}
          />
          <ProdottiCard
            aziendaId={azienda.id}
            stabilimenti={stabilimenti}
            prodotti={prodotti}
            onChange={loadAll}
          />
        </>
      )}
    </div>
  );
}

/* ------------------- ABBONAMENTO ------------------- */
function AbbonamentoCard() {
  const [current, setCurrent] = useState<Plan>("free");
  const [selected, setSelected] = useState<Plan | undefined>(undefined);
  const [msg, setMsg] = useState<string | null>(null);

  // La scelta del piano è salvata localmente: l'attivazione del pagamento
  // (Stripe) arriverà con il modulo prenotazioni/commissioni.
  useEffect(() => {
    const saved = window.localStorage.getItem("biofido_plan") as Plan | null;
    if (saved && saved in PLAN_MAP) setCurrent(saved);
  }, []);

  async function choose(plan: Plan, period: "monthly" | "annual") {
    setSelected(plan);

    // Con Stripe attivo, i piani a pagamento aprono il Checkout; al ritorno il
    // webhook avrà aggiornato il piano. Senza Stripe, salviamo la scelta in
    // locale (l'app resta navigabile in attesa dell'attivazione pagamenti).
    if (billingEnabled && plan !== "free") {
      setMsg("Ti porto al pagamento sicuro…");
      try {
        await startCheckout(plan, period);
      } catch (e) {
        setMsg((e as Error).message);
      }
      return;
    }

    window.localStorage.setItem("biofido_plan", plan);
    setCurrent(plan);
    setMsg(
      plan === "free"
        ? "Sei sul piano Free."
        : `Hai scelto il piano ${PLAN_MAP[plan].label} (${
            period === "annual" ? "annuale" : "mensile"
          }). Attiveremo il pagamento a breve.`
    );
  }

  return (
    <section className="card mt-6 p-6">
      <h2 className="font-display text-2xl text-green-800">Il tuo abbonamento</h2>
      <p className="mt-1 text-sm text-green-900/70">
        Mostra il tuo valore vero, non il prezzo più basso. Cambia piano quando
        vuoi: i costi sono sempre qui sotto.
      </p>
      <div className="mt-6">
        <PianiAbbonamento
          currentPlan={current}
          selectedPlan={selected}
          onSelect={choose}
        />
      </div>
      {msg && (
        <p className="mt-4 rounded-xl bg-leaf px-4 py-3 text-sm font-semibold text-green-800">
          {msg}
        </p>
      )}
    </section>
  );
}

/* ------------------- SCHEDA SULLA MAPPA (produttore) ------------------- */
function SchedaMappaCard({ ownerId }: { ownerId: string }) {
  const [plan, setPlan] = useState<Plan>("free");
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
    }
    setLoading(false);
  }, [ownerId]);

  useEffect(() => {
    const saved = window.localStorage.getItem("biofido_plan") as Plan | null;
    if (saved && saved in PLAN_MAP) setPlan(saved);
    load();
  }, [load]);

  async function save() {
    if (!name.trim() || !city.trim()) {
      setMsg("Inserisci almeno nome e città.");
      return;
    }
    const geo = geocode(city);
    if (!geo) {
      setMsg(`Città "${city}" non riconosciuta: prova con il capoluogo più vicino.`);
      return;
    }
    setSaving(true);
    setMsg(null);
    const { error } = await saveMyBusiness(
      ownerId,
      {
        name,
        category,
        plan,
        city: geo.name,
        lat: geo.lat,
        lon: geo.lon,
        address,
        description,
        website,
        phone,
        products: PLAN_MAP[plan].showProducts
          ? products.filter((p) => p.name.trim())
          : undefined,
      },
      existing?.id,
    );
    setSaving(false);
    if (error) {
      setMsg("Errore: " + error);
      return;
    }
    setMsg("Scheda salvata ✓ — la tua attività è sulla mappa.");
    load();
  }

  return (
    <section className="card mt-6 p-6">
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
              <span className="label">Città *</span>
              <input className="field mt-1" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Es. Genova" />
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
            <div className="mt-5 rounded-2xl border-2 border-dashed border-[#cfe3b4] bg-leaf/40 p-5">
              <h3 className="font-display text-xl text-green-800">
                I tuoi prodotti <span className="text-sm font-normal text-green-900/60">(mostrati sulla mappa, piano Gold)</span>
              </h3>
              <div className="mt-3 space-y-2">
                {products.map((p, i) => (
                  <div key={i} className="grid gap-2 md:grid-cols-[1fr_140px_auto] md:items-center">
                    <input
                      className="field"
                      value={p.name}
                      onChange={(e) =>
                        setProducts((prev) => prev.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))
                      }
                      placeholder="Nome prodotto (es. Cassetta ortaggi misti)"
                    />
                    <input
                      className="field"
                      value={p.price ?? ""}
                      onChange={(e) =>
                        setProducts((prev) => prev.map((x, idx) => (idx === i ? { ...x, price: e.target.value } : x)))
                      }
                      placeholder="Prezzo (€ 15,00)"
                    />
                    <button
                      className="text-xs font-bold text-traffic-red hover:underline"
                      onClick={() => setProducts((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="btn-ghost mt-2 text-sm"
                onClick={() => setProducts((prev) => [...prev, { name: "", price: "" }])}
              >
                + Aggiungi prodotto
              </button>
            </div>
          ) : (
            <p className="mt-3 text-xs text-green-900/55">
              I prodotti con foto e prezzi sulla mappa sono una funzione del piano Gold.
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

/* ------------------- ESPERIENZE (produttore) ------------------- */
function EsperienzeCard({ ownerId }: { ownerId: string }) {
  const [plan, setPlan] = useState<Plan>("free");
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
    const saved = window.localStorage.getItem("biofido_plan") as Plan | null;
    if (saved && saved in PLAN_MAP) setPlan(saved);
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
    <section className="card mt-6 p-6">
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
    <section className="card mt-6 p-6">
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

/* ------------------- ANAGRAFICA AZIENDA ------------------- */
function AnagraficaCard({
  azienda,
  initialNome,
  onSaved,
}: {
  azienda: Azienda | null;
  initialNome?: string;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState(azienda?.nome ?? initialNome ?? "");
  const [piva, setPiva] = useState(azienda?.piva ?? "");
  const [citta, setCitta] = useState(azienda?.citta_sede ?? "");
  const [sito, setSito] = useState(azienda?.sito_web ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setNome(azienda?.nome ?? initialNome ?? "");
    setPiva(azienda?.piva ?? "");
    setCitta(azienda?.citta_sede ?? "");
    setSito(azienda?.sito_web ?? "");
  }, [azienda, initialNome]);

  async function save() {
    setSaving(true);
    setMsg(null);
    const payload = {
      nome,
      piva: piva || null,
      citta_sede: citta || null,
      sito_web: sito || null,
    };
    let error;
    if (azienda) {
      ({ error } = await supabase.from("aziende").update(payload).eq("id", azienda.id));
    } else {
      ({ error } = await supabase.from("aziende").insert(payload));
    }
    setSaving(false);
    if (error) setMsg("Errore: " + error.message);
    else {
      setMsg("Salvato ✓");
      onSaved();
    }
  }

  return (
    <section className="card mt-8 p-6">
      <h2 className="font-display text-2xl text-green-800">Scheda anagrafica</h2>
      <p className="mt-1 text-sm text-green-900/70">
        I dati della tua azienda. La sede non incide sul calcolo CO₂ (conta lo
        stabilimento di produzione).
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="label">Nome azienda *</span>
          <input className="field mt-1" value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Partita IVA</span>
          <input className="field mt-1" value={piva} onChange={(e) => setPiva(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Città sede</span>
          <input className="field mt-1" value={citta} onChange={(e) => setCitta(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Sito web</span>
          <input className="field mt-1" value={sito} onChange={(e) => setSito(e.target.value)} />
        </label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button className="btn-lime" onClick={save} disabled={saving || !nome}>
          {saving ? "Salvataggio…" : azienda ? "Aggiorna dati" : "Salva azienda"}
        </button>
        {msg && <span className="text-sm font-semibold text-green-700">{msg}</span>}
      </div>
    </section>
  );
}

/* ------------------- STABILIMENTI ------------------- */
function StabilimentiCard({
  aziendaId,
  stabilimenti,
  onChange,
}: {
  aziendaId: string;
  stabilimenti: Stabilimento[];
  onChange: () => void;
}) {
  const [nome, setNome] = useState("");
  const [citta, setCitta] = useState("");
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!citta.trim()) return;
    setSaving(true);
    await supabase
      .from("stabilimenti")
      .insert({ azienda_id: aziendaId, nome: nome || null, citta });
    setSaving(false);
    setNome("");
    setCitta("");
    onChange();
  }
  async function remove(id: string) {
    await supabase.from("stabilimenti").delete().eq("id", id);
    onChange();
  }

  return (
    <section className="card mt-6 p-6">
      <h2 className="font-display text-2xl text-green-800">Stabilimenti di produzione</h2>
      <p className="mt-1 text-sm text-green-900/70">
        La città dello stabilimento è il punto da cui si misura la distanza delle
        materie prime.
      </p>

      {stabilimenti.length > 0 && (
        <ul className="mt-4 space-y-2">
          {stabilimenti.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded-xl border border-[#e3eed7] bg-white px-4 py-2"
            >
              <span className="text-green-900">
                <strong>{s.citta}</strong>
                {s.nome ? ` — ${s.nome}` : ""}
              </span>
              <button
                className="text-xs font-bold text-traffic-red hover:underline"
                onClick={() => remove(s.id)}
              >
                Elimina
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <label className="block">
          <span className="label">Città dello stabilimento *</span>
          <input
            className="field mt-1"
            value={citta}
            onChange={(e) => setCitta(e.target.value)}
            placeholder="Es. Cuneo"
          />
        </label>
        <label className="block">
          <span className="label">Nome (facoltativo)</span>
          <input
            className="field mt-1"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Es. Stabilimento principale"
          />
        </label>
        <button className="btn-lime" onClick={add} disabled={saving || !citta}>
          Aggiungi
        </button>
      </div>
    </section>
  );
}

/* ------------------- PRODOTTI ------------------- */
function ProdottiCard({
  aziendaId,
  stabilimenti,
  prodotti,
  onChange,
}: {
  aziendaId: string;
  stabilimenti: Stabilimento[];
  prodotti: Prodotto[];
  onChange: () => void;
}) {
  return (
    <section className="card mt-6 p-6">
      <h2 className="font-display text-2xl text-green-800">I tuoi prodotti</h2>

      {prodotti.length > 0 && (
        <ul className="mt-4 space-y-3">
          {prodotti.map((p) => {
            const fp = computeFootprint(
              p.stabilimento_citta,
              p.ingredienti.map((i) => ({ name: i.nome, origin: i.origine }))
            );
            return (
              <li key={p.id} className="rounded-2xl border border-[#e3eed7] bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-display text-xl text-green-800">{p.nome}</div>
                    <div className="text-xs text-green-900/60">
                      {p.categoria ? p.categoria + " · " : ""}prodotto a {p.stabilimento_citta} ·{" "}
                      {p.ingredienti.length} materie prime
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Semaforo level={fp.level} size="sm" />
                    <div className="text-right">
                      <div className="font-display text-lg text-green-800">
                        {fp.totalCo2Kg.toLocaleString("it-IT")} kg
                      </div>
                      <div className="text-[11px] text-green-900/60">CO₂ trasporto</div>
                    </div>
                    <button
                      className="text-xs font-bold text-traffic-red hover:underline"
                      onClick={async () => {
                        await supabase.from("prodotti").delete().eq("id", p.id);
                        onChange();
                      }}
                    >
                      Elimina
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <NuovoProdotto
        aziendaId={aziendaId}
        stabilimenti={stabilimenti}
        onSaved={onChange}
      />
    </section>
  );
}

function NuovoProdotto({
  aziendaId,
  stabilimenti,
  onSaved,
}: {
  aziendaId: string;
  stabilimenti: Stabilimento[];
  onSaved: () => void;
}) {
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [stab, setStab] = useState(stabilimenti[0]?.citta ?? "");
  const [ingredienti, setIngredienti] = useState<Ingrediente[]>([
    { nome: "", origine: "" },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!stab && stabilimenti[0]) setStab(stabilimenti[0].citta);
  }, [stabilimenti, stab]);

  // calcolo CO2 live
  const fp = useMemo(
    () =>
      computeFootprint(
        stab,
        ingredienti
          .filter((i) => i.nome && i.origine)
          .map((i) => ({ name: i.nome, origin: i.origine }))
      ),
    [stab, ingredienti]
  );

  function setIng(i: number, field: keyof Ingrediente, value: string) {
    setIngredienti((prev) =>
      prev.map((row, idx) => (idx === i ? { ...row, [field]: value } : row))
    );
  }
  function addRow() {
    setIngredienti((prev) => [...prev, { nome: "", origine: "" }]);
  }
  function removeRow(i: number) {
    setIngredienti((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save() {
    const validIngr = ingredienti.filter((i) => i.nome.trim() && i.origine.trim());
    if (!nome.trim() || !stab.trim() || validIngr.length === 0) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("prodotti")
      .insert({
        azienda_id: aziendaId,
        nome,
        categoria: categoria || null,
        stabilimento_citta: stab,
      })
      .select("id")
      .single();
    if (error || !data) {
      setSaving(false);
      alert("Errore nel salvare il prodotto: " + (error?.message ?? ""));
      return;
    }
    const rows = validIngr.map((i) => ({
      prodotto_id: data.id,
      nome: i.nome,
      origine: i.origine,
    }));
    await supabase.from("ingredienti").insert(rows);
    setSaving(false);
    setNome("");
    setCategoria("");
    setIngredienti([{ nome: "", origine: "" }]);
    onSaved();
  }

  const hasStab = stabilimenti.length > 0;

  return (
    <div className="mt-6 rounded-2xl border-2 border-dashed border-[#cfe3b4] bg-leaf/40 p-5">
      <h3 className="font-display text-xl text-green-800">Aggiungi un prodotto</h3>
      {!hasStab && (
        <p className="mt-2 text-sm font-semibold text-traffic-red">
          Aggiungi prima almeno uno stabilimento di produzione qui sopra.
        </p>
      )}

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <label className="block">
          <span className="label">Nome prodotto *</span>
          <input className="field mt-1" value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Categoria</span>
          <input
            className="field mt-1"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            placeholder="Es. Biscotti"
          />
        </label>
        <label className="block">
          <span className="label">Stabilimento *</span>
          <select className="field mt-1" value={stab} onChange={(e) => setStab(e.target.value)}>
            {stabilimenti.map((s) => (
              <option key={s.id} value={s.citta}>
                {s.citta}
                {s.nome ? ` — ${s.nome}` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4">
        <span className="label">Ingredienti e loro origine</span>
        <div className="mt-2 space-y-2">
          {ingredienti.map((row, i) => {
            const res = fp.ingredients.find((r) => r.name === row.nome);
            const notFound =
              row.origine.trim() !== "" &&
              row.nome.trim() !== "" &&
              !!res &&
              !res.resolved;
            return (
              <div key={i} className="grid gap-2 md:grid-cols-[1fr_1fr_auto] md:items-center">
                <input
                  className="field"
                  value={row.nome}
                  onChange={(e) => setIng(i, "nome", e.target.value)}
                  placeholder="Materia prima (es. Farina di farro)"
                />
                <input
                  className="field"
                  value={row.origine}
                  onChange={(e) => setIng(i, "origine", e.target.value)}
                  placeholder="Origine (es. Siena)"
                />
                <div className="flex items-center gap-2">
                  {notFound && (
                    <span className="text-xs text-traffic-red">località ?</span>
                  )}
                  {ingredienti.length > 1 && (
                    <button
                      className="text-xs font-bold text-traffic-red hover:underline"
                      onClick={() => removeRow(i)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <button className="btn-ghost mt-2 text-sm" onClick={addRow}>
          + Aggiungi materia prima
        </button>
      </div>

      {/* anteprima CO2 live */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-4">
        <div className="flex items-center gap-3">
          <Semaforo level={fp.level} score={fp.score} />
        </div>
        <div className="text-right">
          <div className="font-display text-3xl text-green-800">
            {fp.totalCo2Kg.toLocaleString("it-IT")} kg
          </div>
          <div className="text-xs text-green-900/60">
            CO₂ di trasporto stimata · {fp.totalKm.toLocaleString("it-IT")} km
          </div>
        </div>
      </div>

      <button
        className="btn-lime mt-4"
        onClick={save}
        disabled={saving || !hasStab || !nome.trim()}
      >
        {saving ? "Salvataggio…" : "Salva prodotto"}
      </button>
    </div>
  );
}
