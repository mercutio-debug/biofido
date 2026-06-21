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
