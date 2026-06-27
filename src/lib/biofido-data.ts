import { supabase } from "./supabase";
import type { CategoryId, Plan } from "./categories";
import type { Experience } from "./bookings";

/**
 * Un'attività biologica mostrata sulla mappa di BioFido.
 * Le attività arrivano dal database Supabase condiviso con ECO-VISA
 * (tabella `biofido_businesses`). Se il database non è raggiungibile o è
 * vuoto, si usano i dati DEMO qui sotto, così l'app è sempre navigabile.
 */
/** una materia prima del prodotto, con l'origine geolocalizzata (per l'impronta) */
export type MateriaPrima = {
  nome: string;
  origine: string;
  lat?: number;
  lon?: number;
};

export type Product = {
  /** id del prodotto nel listino (tabella `prodotti`): lega la prenotazione
   *  alla fonte del prezzo, così il pagamento ricalcola l'importo lato server. */
  id?: string;
  /** id della voce di catalogo (tabella `catalogo`), per i servizi extra:
   *  alternativa a `id`, stessa finalità di ricalcolo prezzo lato server. */
  voceId?: string;
  name: string;
  price?: string;
  /** unità di prezzo: "a cassetta", "al kg", "a pezzo"… */
  unit?: string;
  category?: string;
  description?: string;
  image?: string;
  ingredients?: MateriaPrima[];
  certifications?: string[];
  /** se false, il prodotto resta in vetrina SENZA semaforo di sostenibilità.
   *  Default: true (mostra il semaforo calcolato dagli ingredienti). */
  mostraSemaforo?: boolean;
  /** "servizio extra" prenotabile dal cliente nel widget (visite, laboratori,
   *  esperienze). Se true l'azienda ha accettato di renderlo prenotabile. */
  prenotabile?: boolean;
  /** ordinabile dai clienti nello shop (Gold) — Fase A e-commerce */
  in_shop?: boolean;
  /** seconda foto del prodotto, es. l'etichetta (Gold) */
  foto2?: string;
  /** giacenza a magazzino (Gold); assente = non gestita / illimitata */
  giacenza?: number;
  /** scorta piena di riferimento per i reminder (metà / un terzo / esaurito) */
  giacenza_iniziale?: number;
  /** confezione (flacone, barattolo…), contenuto e relativa unità (gr/kg/l/ml…) */
  confezione?: string;
  contenuto?: number;
  unita?: string;
  /** durata dell'attività, se è un servizio speciale (es. "2 ore") */
  durata?: string;
};

export type Business = {
  id: string;
  name: string;
  category: CategoryId;
  plan: Plan;
  lat: number;
  lon: number;
  city: string;
  address?: string;
  /** breve storia/descrizione (visibile per i piani Silver e Gold) */
  description?: string;
  website?: string;
  phone?: string;
  /** immagine di copertina dell'azienda (mostrata nella scheda, per i Gold) */
  immagine?: string;
  /** prodotti con foto e prezzi (solo piano Gold) */
  products?: Product[];
  /** false = shop in attesa di approvazione (prodotti in_shop nascosti al pubblico) */
  shop_approvato?: boolean | null;
  /** true = il produttore vuole pubblicare la sua vetrina ANCHE su ECO-VISA (richiede ≥2/3 prodotti col semaforo) */
  pubblicaEcovisa?: boolean;
  /** id utente proprietario della scheda (per legare le esperienze) */
  owner?: string;
  /** esperienze prenotabili del produttore (caricate a parte o demo) */
  experiences?: Experience[];
};

/** Dati dimostrativi: attività bio reali-verosimili attorno alla Liguria. */
export const DEMO_BUSINESSES: Business[] = [
  {
    id: "demo-1",
    name: "Cascina Verde — Ortaggi Bio",
    category: "agricola",
    plan: "gold",
    lat: 44.46, lon: 8.76, city: "Genova",
    address: "Via dei Campi 12",
    description:
      "Azienda agricola familiare dal 1978. Coltiviamo ortaggi di stagione con metodo biologico certificato, nel rispetto della terra.",
    website: "www.cascinaverde.example",
    phone: "+39 010 1234567",
    products: [
      { name: "Cassetta ortaggi misti", price: "€ 15,00" },
      { name: "Pomodori cuore di bue (kg)", price: "€ 4,50" },
      { name: "Insalata novella (cespo)", price: "€ 1,80" },
    ],
    owner: "demo-owner-1",
    experiences: [
      {
        id: "demo-exp-1", owner: "demo-owner-1",
        titolo: "Visita guidata all'orto bio",
        descrizione: "Tour dei campi con raccolta e assaggio di stagione.",
        prezzoCents: 1500, durataMin: 90, maxPersone: 12, attiva: true,
      },
      {
        id: "demo-exp-2", owner: "demo-owner-1",
        titolo: "Degustazione conserve della cascina",
        descrizione: "Sott'oli, salse e confetture con pane fatto in casa.",
        prezzoCents: 2500, durataMin: 60, maxPersone: 8, attiva: true,
      },
    ],
  },
  {
    id: "demo-2",
    name: "Bottega Bio del Centro",
    category: "negozio",
    plan: "silver",
    lat: 44.41, lon: 8.93, city: "Genova",
    address: "Via San Lorenzo 40",
    description: "Negozio di alimentari biologici e sfusi nel cuore di Genova.",
    phone: "+39 010 7654321",
  },
  {
    id: "demo-3",
    name: "Osteria delle Erbe",
    category: "ristorante",
    plan: "gold",
    lat: 44.40, lon: 8.95, city: "Genova",
    address: "Vico Indoratori 5",
    description:
      "Cucina ligure a chilometro zero: ingredienti dai produttori bio del territorio.",
    products: [
      { name: "Trofie al pesto bio", price: "€ 11,00" },
      { name: "Menu degustazione km0", price: "€ 32,00" },
    ],
  },
  {
    id: "demo-4",
    name: "Apicoltura Monti Liguri",
    category: "artigiano",
    plan: "silver",
    lat: 44.50, lon: 9.03, city: "Genova",
    address: "Loc. Crocetta d'Orero",
    description: "Mieli artigianali biologici dell'Appennino ligure.",
  },
  {
    id: "demo-5",
    name: "Frutteto del Sole",
    category: "agricola",
    plan: "free",
    lat: 44.31, lon: 8.48, city: "Savona",
  },
  {
    id: "demo-6",
    name: "NaturaSì Savona",
    category: "negozio",
    plan: "free",
    lat: 44.30, lon: 8.47, city: "Savona",
  },
  {
    id: "demo-7",
    name: "Agriturismo Le Querce",
    category: "ristorante",
    plan: "silver",
    lat: 44.39, lon: 7.55, city: "Cuneo",
    description: "Agriturismo con prodotti propri biologici, tra le colline cuneesi.",
  },
  {
    id: "demo-8",
    name: "Forno Antico a Lievito Madre",
    category: "artigiano",
    plan: "free",
    lat: 44.41, lon: 8.92, city: "Genova",
  },
  {
    id: "demo-9",
    name: "Orto di Mare",
    category: "agricola",
    plan: "free",
    lat: 44.10, lon: 8.21, city: "Savona",
  },
];

/** Riga grezza letta da Supabase (snake_case). */
type Row = {
  id: string | number;
  name: string;
  category: string;
  plan: string;
  lat: number;
  lon: number;
  city: string;
  address?: string | null;
  description?: string | null;
  website?: string | null;
  phone?: string | null;
  immagine?: string | null;
  products?: Product[] | null;
  owner?: string | null;
  shop_approvato?: boolean | null;
  pubblica_ecovisa?: boolean | null;
  archiviato_il?: string | null;
};

function fromRow(r: Row): Business {
  return {
    id: String(r.id),
    name: r.name,
    category: (r.category as CategoryId) ?? "negozio",
    plan: (r.plan as Plan) ?? "free",
    lat: Number(r.lat),
    lon: Number(r.lon),
    city: r.city,
    address: r.address ?? undefined,
    description: r.description ?? undefined,
    website: r.website ?? undefined,
    phone: r.phone ?? undefined,
    immagine: r.immagine ?? undefined,
    products: r.products ?? undefined,
    owner: r.owner ?? undefined,
    shop_approvato: r.shop_approvato ?? undefined,
    pubblicaEcovisa: r.pubblica_ecovisa ?? undefined,
  };
}

/**
 * Ricarica LIVE una singola scheda dal DB (per la pagina statica /azienda/[slug]:
 * il prop è lo snapshot al build, mentre prodotti/ingredienti/semaforo cambiano
 * dopo — es. col re-sync. Qui prendiamo sempre l'ultima versione dal database).
 */
export async function businessByOwnerLive(owner: string): Promise<Business | null> {
  if (!owner) return null;
  try {
    const { data } = await supabase
      .from("biofido_businesses")
      .select("*")
      .eq("owner", owner)
      .maybeSingle();
    if (!data) return null;
    if ((data as Row).archiviato_il) return null; // scheda archiviata: non più pubblica
    const b = fromRow(data as Row);
    // posizione precisa dall'anagrafica (come in loadBusinesses)
    try {
      const { data: az } = await supabase
        .from("aziende_pubbliche")
        .select("lat, lon")
        .eq("owner", owner)
        .maybeSingle();
      const a = az as { lat?: number | null; lon?: number | null } | null;
      if (a?.lat != null && a?.lon != null) {
        b.lat = Number(a.lat);
        b.lon = Number(a.lon);
      }
    } catch {
      /* anagrafica non leggibile: tengo le coordinate del business */
    }
    return b;
  } catch {
    return null;
  }
}

/**
 * Carica le attività dal database Supabase condiviso.
 * Ritorna sempre un elenco: in caso di errore o tabella vuota usa i dati DEMO.
 */
export async function loadBusinesses(): Promise<{ items: Business[]; source: "supabase" | "demo" }> {
  try {
    // select("*"): la colonna "immagine" può non esistere su DB più vecchi →
    // così non si rompe la mappa (le colonne mancanti restano semplicemente assenti).
    const { data, error } = await supabase.from("biofido_businesses").select("*");
    if (error) throw error;
    if (data && data.length > 0) {
      // le schede ARCHIVIATE (account cancellato) spariscono dalla mappa pubblica.
      // Filtro in codice: se la colonna non esiste ancora, archiviato_il è undefined.
      const items = (data as Row[]).filter((r) => !r.archiviato_il).map(fromRow);
      // La posizione VERA è quella che l'azienda salva col pin in anagrafica
      // (tabella aziende). biofido_businesses.lat/lon può essere stantio: lo
      // sovrascrivo con le coordinate precise di aziende, se presenti.
      try {
        const { data: az } = await supabase
          .from("aziende_pubbliche")
          .select("owner, lat, lon");
        const byOwner = new Map<string, { lat: number; lon: number }>();
        for (const a of (az as { owner?: string; lat?: number | null; lon?: number | null }[]) ?? []) {
          if (a.owner && a.lat != null && a.lon != null) {
            byOwner.set(a.owner, { lat: Number(a.lat), lon: Number(a.lon) });
          }
        }
        for (const it of items) {
          const p = it.owner ? byOwner.get(it.owner) : undefined;
          if (p) {
            it.lat = p.lat;
            it.lon = p.lon;
          }
        }
      } catch {
        /* aziende non leggibili: tengo le coordinate del business */
      }
      return { items, source: "supabase" };
    }
  } catch {
    // tabella assente, RLS, o rete: si prosegue con i dati demo
  }
  return { items: DEMO_BUSINESSES, source: "demo" };
}

/* ---- pagine-attività condivisibili (/azienda/[slug]) ---- */

/** Slug url-safe da un nome (minuscolo, accenti rimossi, spazi → -). */
export function businessSlug(name: string): string {
  return (
    (name || "attivita")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "attivita"
  );
}

export type BusinessConSlug = Business & { slug: string };

/**
 * Tutte le attività con uno slug STABILE e UNIVOCO per la pagina condivisibile
 * /azienda/[slug]. Ordino per id (stabile tra build) e disambiguo i nomi
 * duplicati con un suffisso derivato dall'id.
 */
export async function elencoBusinessConSlug(): Promise<BusinessConSlug[]> {
  const { items } = await loadBusinesses();
  const sorted = [...items].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const used = new Set<string>();
  return sorted.map((b) => {
    let slug = businessSlug(b.name);
    if (used.has(slug)) slug = `${slug}-${String(b.id).slice(0, 4)}`;
    while (used.has(slug)) slug = `${slug}-${String(b.id).slice(0, 8)}`;
    used.add(slug);
    return { ...b, slug };
  });
}

/** Risolve uno slug nell'attività corrispondente (per la pagina statica). */
export async function businessBySlug(slug: string): Promise<BusinessConSlug | null> {
  return (await elencoBusinessConSlug()).find((b) => b.slug === slug) ?? null;
}

/* ---- gestione della propria scheda (produttore) ---- */

/** Carica la scheda mappa del produttore loggato (se esiste). */
export async function loadMyBusiness(owner: string): Promise<Business | null> {
  const { data } = await supabase
    .from("biofido_businesses")
    .select("*")
    .eq("owner", owner)
    .limit(1)
    .maybeSingle();
  return data ? fromRow(data as Row) : null;
}

export type SaveBusinessInput = {
  name: string;
  category: CategoryId;
  plan: Plan;
  city: string;
  lat: number;
  lon: number;
  address?: string;
  description?: string;
  website?: string;
  phone?: string;
  products?: Product[];
  pubblicaEcovisa?: boolean;
};

/** Crea o aggiorna la scheda mappa del produttore. */
export async function saveMyBusiness(
  owner: string,
  input: SaveBusinessInput,
  id?: string,
): Promise<{ error?: string }> {
  const payload = {
    owner,
    name: input.name,
    category: input.category,
    plan: input.plan,
    lat: input.lat,
    lon: input.lon,
    city: input.city,
    address: input.address || null,
    description: input.description || null,
    website: input.website || null,
    phone: input.phone || null,
    products: input.products && input.products.length ? input.products : null,
    pubblica_ecovisa: input.pubblicaEcovisa ?? false,
  };
  const esegui = () =>
    id
      ? supabase.from("biofido_businesses").update(payload).eq("id", id)
      : supabase.from("biofido_businesses").insert(payload);
  let { error } = await esegui();
  // se la colonna pubblica_ecovisa non esiste ancora nel DB, la tolgo e riprovo
  // (così il salvataggio non si rompe finché non lanci la piccola migrazione)
  if (error && /pubblica_ecovisa/i.test(error.message)) {
    delete (payload as Record<string, unknown>).pubblica_ecovisa;
    ({ error } = await esegui());
  }
  return { error: error?.message };
}
