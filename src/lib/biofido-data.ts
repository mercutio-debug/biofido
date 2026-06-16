import { supabase } from "./supabase";
import type { CategoryId, Plan } from "./categories";
import type { Experience } from "./bookings";

/**
 * Un'attività biologica mostrata sulla mappa di BioFido.
 * Le attività arrivano dal database Supabase condiviso con ECO-VISA
 * (tabella `biofido_businesses`). Se il database non è raggiungibile o è
 * vuoto, si usano i dati DEMO qui sotto, così l'app è sempre navigabile.
 */
export type Product = {
  name: string;
  price?: string;
  image?: string;
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
  /** prodotti con foto e prezzi (solo piano Gold) */
  products?: Product[];
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
  products?: Product[] | null;
  owner?: string | null;
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
    products: r.products ?? undefined,
    owner: r.owner ?? undefined,
  };
}

/**
 * Carica le attività dal database Supabase condiviso.
 * Ritorna sempre un elenco: in caso di errore o tabella vuota usa i dati DEMO.
 */
export async function loadBusinesses(): Promise<{ items: Business[]; source: "supabase" | "demo" }> {
  try {
    const { data, error } = await supabase
      .from("biofido_businesses")
      .select("id,name,category,plan,lat,lon,city,address,description,website,phone,products,owner");
    if (error) throw error;
    if (data && data.length > 0) {
      return { items: (data as Row[]).map(fromRow), source: "supabase" };
    }
  } catch {
    // tabella assente, RLS, o rete: si prosegue con i dati demo
  }
  return { items: DEMO_BUSINESSES, source: "demo" };
}
