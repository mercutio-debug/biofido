/**
 * Carrello e-commerce (Fase A: fondamenta). Un cliente può raccogliere più
 * prodotti dello stesso produttore; il carrello vive in localStorage finché non
 * costruiamo il drawer + checkout (Fase B). Gemello ECO-VISA / BioFido.
 */
import { supabase } from "./supabase";

export type CartItem = {
  prodottoId: string;
  nome: string;
  prezzo: string | null;
  aziendaId: string;
  aziendaNome: string;
  /** owner (user id) del produttore: serve per inviargli l'ordine */
  owner: string | null;
  immagine: string | null;
  /** giacenza a magazzino (null = non gestita / illimitata) */
  giacenza?: number | null;
  qta: number;
};

const KEY = "biofido_carrello";

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as CartItem[];
  } catch {
    return [];
  }
}

function save(c: CartItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
    window.dispatchEvent(new Event("carrello-cambiato"));
  } catch {
    /* storage non disponibile */
  }
  // Best-effort: i clienti loggati salvano il carrello anche lato server, così la
  // funzione `solleciti-mail` può ricordare "il tuo carrello ti aspetta".
  void sincronizzaCarrelloServer(c);
}

/** Salva (o cancella) il carrello del cliente loggato su Supabase. Silenzioso. */
async function sincronizzaCarrelloServer(items: CartItem[]): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const tipo = (user.user_metadata as { tipo?: string } | undefined)?.tipo;
    if (tipo !== "cliente") return; // il carrello shop è dei clienti finali
    if (!items.length) {
      await supabase.from("carrelli_clienti").delete().eq("user_id", user.id);
      return;
    }
    await supabase.from("carrelli_clienti").upsert({
      user_id: user.id,
      items: items.map((i) => ({ nome: i.nome, qta: i.qta, azienda: i.aziendaNome })),
      email: user.email,
      aggiornato: new Date().toISOString(),
      solleciti: 0,
      ultimo_sollecito: null,
    });
  } catch {
    /* offline / non loggato / tabella assente: pazienza */
  }
}

/** Aggiunge (o incrementa) un prodotto e ritorna il carrello aggiornato. */
export function addToCart(item: Omit<CartItem, "qta">, qta = 1): CartItem[] {
  const c = getCart();
  const ex = c.find((x) => x.prodottoId === item.prodottoId);
  if (ex) ex.qta += qta;
  else c.push({ ...item, qta });
  save(c);
  return c;
}

export function setQty(prodottoId: string, qta: number): CartItem[] {
  const c = getCart()
    .map((x) => (x.prodottoId === prodottoId ? { ...x, qta } : x))
    .filter((x) => x.qta > 0);
  save(c);
  return c;
}

export function removeItem(prodottoId: string): CartItem[] {
  const c = getCart().filter((x) => x.prodottoId !== prodottoId);
  save(c);
  return c;
}

/** Svuota gli articoli di un singolo produttore (dopo l'invio dell'ordine). */
export function clearGroup(aziendaId: string): CartItem[] {
  const c = getCart().filter((x) => x.aziendaId !== aziendaId);
  save(c);
  return c;
}

export function cartCount(): number {
  return getCart().reduce((n, x) => n + x.qta, 0);
}
