import { computeFootprint, type IngredientInput } from "./footprint";

export type Company = {
  name: string;
  vat: string; // P.IVA
  city: string;
  website?: string;
};

export type Product = {
  slug: string;
  name: string;
  category: string; // categoria merceologica (per le alternative)
  company: Company;
  plant: string; // stabilimento di produzione
  image?: string;
  ingredients: IngredientInput[];
};

export const PRODUCTS: Product[] = [
  {
    slug: "biscotti-al-farro-di-zia-pina",
    name: "Biscotti al farro di zia Pina",
    category: "Biscotti",
    company: {
      name: "Dolciaria Zia Pina S.r.l.",
      vat: "IT0123456789",
      city: "Cuneo",
      website: "www.ziapina.example",
    },
    plant: "Cuneo",
    ingredients: [
      { name: "Farina di farro", origin: "Siena" },
      { name: "Zucchero di canna", origin: "Brasile" },
      { name: "Burro", origin: "Romania" },
      { name: "Olio extravergine d'oliva", origin: "Bari" },
    ],
  },
  {
    slug: "cantuccini-la-nuova-fornaia-bio",
    name: "Cantuccini — La Nuova Fornaia Bio",
    category: "Biscotti",
    company: {
      name: "La Nuova Fornaia Bio",
      vat: "IT0987654321",
      city: "Firenze",
      website: "www.nuovafornaia.example",
    },
    plant: "Firenze",
    ingredients: [
      { name: "Farina di grano", origin: "Siena" },
      { name: "Zucchero", origin: "Bologna" },
      { name: "Uova", origin: "Perugia" },
      { name: "Mandorle", origin: "Bari" },
    ],
  },
  {
    slug: "biscotti-integrali-del-borgo",
    name: "Biscotti integrali Forno del Borgo",
    category: "Biscotti",
    company: {
      name: "Forno del Borgo",
      vat: "IT1122334455",
      city: "Torino",
      website: "www.fornodelborgo.example",
    },
    plant: "Torino",
    ingredients: [
      { name: "Farina integrale", origin: "Cuneo" },
      { name: "Zucchero", origin: "Torino" },
      { name: "Burro", origin: "Milano" },
      { name: "Miele", origin: "Aosta" },
    ],
  },
  {
    slug: "olio-evo-collina-dorata",
    name: "Olio EVO Collina Dorata",
    category: "Olio d'oliva",
    company: {
      name: "Frantoio Collina Dorata",
      vat: "IT2233445566",
      city: "Lecce",
    },
    plant: "Lecce",
    ingredients: [{ name: "Olive", origin: "Lecce" }],
  },
  {
    slug: "passata-pomodoro-sole-del-sud",
    name: "Passata di pomodoro Sole del Sud",
    category: "Conserve",
    company: {
      name: "Sole del Sud S.r.l.",
      vat: "IT3344556677",
      city: "Napoli",
    },
    plant: "Napoli",
    ingredients: [
      { name: "Pomodoro", origin: "Napoli" },
      { name: "Sale", origin: "Cagliari" },
    ],
  },
];

export function getProduct(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

/** prodotti della stessa categoria, ordinati dal più ecologico al meno */
export function alternativesFor(slug: string) {
  const base = getProduct(slug);
  if (!base) return [];
  return PRODUCTS.filter(
    (p) => p.slug !== slug && p.category === base.category
  )
    .map((p) => ({
      product: p,
      footprint: computeFootprint(p.plant, p.ingredients),
    }))
    .sort((a, b) => b.footprint.score - a.footprint.score);
}

/* ---------- BioFido: produttori biologici geolocalizzati ---------- */
export type BioProducer = {
  id: string;
  name: string;
  category: string;
  city: string; // località (geocodificata)
  bio: boolean;
};

export const BIO_PRODUCERS: BioProducer[] = [
  { id: "b1", name: "Azienda Agricola Le Tre Querce", category: "Ortofrutta", city: "Genova", bio: true },
  { id: "b2", name: "Caseificio Monti Liguri", category: "Formaggi", city: "Savona", bio: true },
  { id: "b3", name: "Biscottificio Artigianale Mulino Verde", category: "Biscotti", city: "Genova", bio: true },
  { id: "b4", name: "Frantoio Bio Riviera", category: "Olio d'oliva", city: "Savona", bio: true },
  { id: "b5", name: "Orto di Città", category: "Ortofrutta", city: "Milano", bio: true },
  { id: "b6", name: "Apicoltura del Bosco", category: "Miele", city: "Aosta", bio: true },
  { id: "b7", name: "Cantina dei Colli", category: "Vino", city: "Firenze", bio: true },
  { id: "b8", name: "Pastificio Grano Antico", category: "Pasta", city: "Bari", bio: true },
  { id: "b9", name: "Forno a Legna La Spiga", category: "Biscotti", city: "Torino", bio: true },
  { id: "b10", name: "Latteria Bio Padana", category: "Formaggi", city: "Milano", bio: true },
  { id: "b11", name: "Agriturismo Sole e Terra", category: "Ortofrutta", city: "Roma", bio: true },
  { id: "b12", name: "Mielizia del Sud", category: "Miele", city: "Napoli", bio: true },
];

/* ---------- Spesa km0: spacci e negozi aziendali ---------- */
export type Km0Store = {
  id: string;
  name: string;
  category: string;
  city: string;
  type: "spaccio aziendale" | "negozio diretto" | "mercato contadino";
};

export const KM0_STORES: Km0Store[] = [
  { id: "s1", name: "Biscottificio del Quartiere", category: "Biscotti", city: "Roma", type: "negozio diretto" },
  { id: "s2", name: "Forno Antico Spaccio", category: "Biscotti", city: "Genova", type: "spaccio aziendale" },
  { id: "s3", name: "Mercato Contadino di Torino", category: "Biscotti", city: "Torino", type: "mercato contadino" },
  { id: "s4", name: "Bottega del Frantoio", category: "Olio d'oliva", city: "Lecce", type: "negozio diretto" },
  { id: "s5", name: "Spaccio Conserve Vesuvio", category: "Conserve", city: "Napoli", type: "spaccio aziendale" },
  { id: "s6", name: "Panificio Dolci di Casa", category: "Biscotti", city: "Milano", type: "negozio diretto" },
  { id: "s7", name: "La Bottega Bio", category: "Biscotti", city: "Firenze", type: "negozio diretto" },
];
