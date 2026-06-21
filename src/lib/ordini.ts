import { supabase } from "./supabase";

/**
 * Ordini di PRODOTTI (Fase A e-commerce). Il cliente crea l'ordine e autorizza
 * subito il pagamento (Stripe manual capture): i fondi sono bloccati ma non
 * prelevati finché l'azienda non accetta. Gemello ECO-VISA / BioFido.
 */
const FUNCTIONS_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
  : "";

export type Venditore = {
  ragioneSociale: string;
  partitaIva: string;
  citta: string | null;
  provincia: string | null;
} | null;

/** Identità legale del venditore di un articolo, per il blocco "venditore". */
export async function getSellerInfo(catalogoId: string): Promise<Venditore> {
  try {
    const res = await fetch(`${FUNCTIONS_BASE}/seller-info`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ catalogoId }),
    });
    if (!res.ok) return null;
    const { venditore } = await res.json();
    return venditore ?? null;
  } catch {
    return null;
  }
}

export type CreaOrdineInput = {
  prodottoId: string;
  owner: string;
  quantita: number;
  clienteNome: string;
  clienteEmail: string;
  clienteTel?: string;
  modalita: "spedizione" | "ritiro";
  indirizzo?: string;
  cap?: string;
  citta?: string;
  prov?: string;
  /** spunte dei 3 consensi obbligatori */
  consensi: Record<string, boolean>;
  portale?: string;
};

/**
 * Crea l'ordine (stato 'richiesto') e avvia l'autorizzazione del pagamento.
 * In caso di successo reindirizza a Stripe; altrimenti torna un errore leggibile.
 */
export async function creaOrdineEPaga(input: CreaOrdineInput): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Accedi come cliente per ordinare." };

  const { data: ord, error } = await supabase
    .from("ordini")
    .insert({
      prodotto_id: input.prodottoId,
      owner: input.owner,
      cliente_user_id: user.id,
      cliente_nome: input.clienteNome,
      cliente_email: input.clienteEmail,
      cliente_tel: input.clienteTel || null,
      quantita: input.quantita,
      modalita: input.modalita,
      spedizione_indirizzo: input.indirizzo || null,
      spedizione_cap: input.cap || null,
      spedizione_citta: input.citta || null,
      spedizione_prov: input.prov || null,
      consensi: { ...input.consensi, ts: new Date().toISOString() },
      stato: "richiesto",
      portale: input.portale || null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: "Sessione scaduta. Accedi di nuovo." };

  const res = await fetch(`${FUNCTIONS_BASE}/order-authorize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ ordineId: ord.id }),
  });
  if (!res.ok) {
    const { error: e } = await res.json().catch(() => ({ error: "" }));
    return { error: e || "Impossibile avviare il pagamento." };
  }
  const { url } = await res.json();
  if (!url) return { error: "Link di pagamento non disponibile." };
  window.location.href = url;
  return {};
}

export type Ordine = {
  id: string;
  prodotto_id: string;
  owner: string;
  cliente_user_id: string;
  cliente_nome: string;
  cliente_email: string;
  cliente_tel: string | null;
  quantita: number;
  modalita: "spedizione" | "ritiro";
  spedizione_indirizzo: string | null;
  spedizione_cap: string | null;
  spedizione_citta: string | null;
  spedizione_prov: string | null;
  totale_cents: number;
  commissione_cents: number;
  stato: string;
  stripe_payment_intent: string | null;
  created_at: string;
};

/** Ordini ricevuti dall'azienda loggata (RLS: solo i propri come venditore). */
export async function loadOrdiniRicevuti(): Promise<Ordine[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("ordini")
    .select("*")
    .eq("owner", user.id)
    .order("created_at", { ascending: false });
  return (data as Ordine[]) ?? [];
}

/** Ordini effettuati dal cliente loggato. */
export async function loadMieiOrdini(): Promise<Ordine[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("ordini")
    .select("*")
    .eq("cliente_user_id", user.id)
    .order("created_at", { ascending: false });
  return (data as Ordine[]) ?? [];
}

async function callOrderFn(fn: string, ordineId: string): Promise<{ error?: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: "Accedi di nuovo." };
  const res = await fetch(`${FUNCTIONS_BASE}/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ ordineId }),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "" }));
    return { error: error || "Operazione non riuscita." };
  }
  return {};
}

/** L'azienda accetta l'ordine → addebito (capture). */
export const accettaOrdine = (ordineId: string) => callOrderFn("order-capture", ordineId);
/** L'azienda rifiuta l'ordine → rilascio dell'autorizzazione. */
export const rifiutaOrdine = (ordineId: string) => callOrderFn("order-cancel", ordineId);

/** Aggiorna lo stato (es. 'spedito', 'consegnato') — RLS: solo l'owner. */
export async function setStatoOrdine(
  ordineId: string,
  stato: string,
): Promise<{ error?: string }> {
  const { error } = await supabase.from("ordini").update({ stato }).eq("id", ordineId);
  return { error: error?.message };
}

/** Segnala un annuncio del catalogo (notice-and-action DSA). Inserimento aperto. */
export async function segnalaAnnuncio(input: {
  catalogoId: string;
  motivo: string;
  dettaglio?: string;
  email?: string;
  portale?: string;
}): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("segnalazioni").insert({
    catalogo_id: input.catalogoId,
    segnalante: user?.id ?? null,
    email: input.email || null,
    motivo: input.motivo,
    dettaglio: input.dettaglio || null,
    portale: input.portale || null,
  });
  return { error: error?.message };
}
