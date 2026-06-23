import { supabase } from "./supabase";

/**
 * Ordini "shop" (Fase C): flusso RICHIESTA → CONFERMA/CONTROPROPOSTA → ACCETTA →
 * (pagamento, Fase D). Diverso dagli `ordini` catalogo (pay-first): qui il
 * cliente invia la richiesta dal carrello, l'azienda conferma o propone
 * un'alternativa (es. 5 invece di 10), il cliente accetta e solo dopo paga.
 * Gemello ECO-VISA / BioFido (stessa tabella `ordini_shop` su Supabase).
 */
export type ArticoloOrdine = {
  prodottoId: string;
  nome: string;
  prezzo: string | null;
  qta: number;
};

export type StatoOrdineShop =
  | "richiesto"
  | "confermato"
  | "controproposta"
  | "accettato"
  | "rifiutato"
  | "annullato"
  | "pagato";

export type OrdineShop = {
  id: string;
  owner: string;
  clienteUserId: string;
  clienteNome: string | null;
  clienteEmail: string | null;
  aziendaNome: string | null;
  portale: string | null;
  articoli: ArticoloOrdine[];
  controproposta: ArticoloOrdine[] | null;
  stato: StatoOrdineShop;
  nota: string | null;
  createdAt?: string;
};

type Row = {
  id: string;
  owner: string;
  cliente_user_id: string;
  cliente_nome: string | null;
  cliente_email: string | null;
  azienda_nome: string | null;
  portale: string | null;
  articoli: ArticoloOrdine[] | null;
  controproposta: ArticoloOrdine[] | null;
  stato: StatoOrdineShop;
  nota: string | null;
  created_at?: string;
};

const fromRow = (r: Row): OrdineShop => ({
  id: r.id,
  owner: r.owner,
  clienteUserId: r.cliente_user_id,
  clienteNome: r.cliente_nome,
  clienteEmail: r.cliente_email,
  aziendaNome: r.azienda_nome,
  portale: r.portale,
  articoli: r.articoli ?? [],
  controproposta: r.controproposta ?? null,
  stato: r.stato,
  nota: r.nota,
  createdAt: r.created_at,
});

/** Crea un ordine dal carrello (uno per produttore). */
export async function createOrdineShop(input: {
  owner: string;
  aziendaNome: string;
  portale: string;
  articoli: ArticoloOrdine[];
}): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Accedi come cliente per ordinare." };
  const { error } = await supabase.from("ordini_shop").insert({
    owner: input.owner,
    cliente_user_id: user.id,
    cliente_email: user.email ?? null,
    cliente_nome: (user.user_metadata?.nome as string) || user.email || null,
    azienda_nome: input.aziendaNome,
    portale: input.portale,
    articoli: input.articoli,
    stato: "richiesto",
  });
  return { error: error?.message };
}

/** Ordini ricevuti dall'azienda loggata (RLS: solo i propri). */
export async function listOrdiniRicevutiShop(): Promise<OrdineShop[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("ordini_shop")
    .select("*")
    .eq("owner", user.id)
    .order("created_at", { ascending: false });
  return ((data as Row[]) ?? []).map(fromRow);
}

/** Ordini effettuati dal cliente loggato. */
export async function listMieiOrdiniShop(): Promise<OrdineShop[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("ordini_shop")
    .select("*")
    .eq("cliente_user_id", user.id)
    .order("created_at", { ascending: false });
  return ((data as Row[]) ?? []).map(fromRow);
}

const upd = async (id: string, patch: Record<string, unknown>) => {
  const { error } = await supabase
    .from("ordini_shop")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  return { error: error?.message };
};

/* --- azioni dell'azienda --- */
export const confermaOrdineShop = (id: string) => upd(id, { stato: "confermato" });
export const rifiutaOrdineShop = (id: string) => upd(id, { stato: "rifiutato" });
export const controproponiOrdineShop = (id: string, articoli: ArticoloOrdine[]) =>
  upd(id, { stato: "controproposta", controproposta: articoli });

/* --- azioni del cliente (sulla controproposta) --- */
export const accettaContropropostaShop = (id: string) => upd(id, { stato: "accettato" });
export const rifiutaContropropostaShop = (id: string) => upd(id, { stato: "rifiutato" });
export const annullaOrdineShop = (id: string) => upd(id, { stato: "annullato" });

/** Fase D: avvia il pagamento (Stripe Checkout) di un ordine confermato/accettato. */
export async function pagaOrdineShop(ordineId: string): Promise<{ error?: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: "Accedi per pagare." };
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return { error: "Configurazione mancante." };
  try {
    const res = await fetch(`${base}/functions/v1/shop-checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ ordineId }),
    });
    const data = await res.json();
    if (!res.ok || data.error) return { error: data.error || "Errore nel pagamento." };
    if (data.url) {
      window.location.href = data.url;
      return {};
    }
    return { error: "Sessione di pagamento non creata." };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
