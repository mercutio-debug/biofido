/**
 * Carrello e-commerce (Fase A: fondamenta). Un cliente può raccogliere più
 * prodotti dello stesso produttore; il carrello vive in localStorage finché non
 * costruiamo il drawer + checkout (Fase B). Gemello ECO-VISA / BioFido.
 */
export type CartItem = {
  prodottoId: string;
  nome: string;
  prezzo: string | null;
  aziendaId: string;
  aziendaNome: string;
  immagine: string | null;
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

export function cartCount(): number {
  return getCart().reduce((n, x) => n + x.qta, 0);
}
