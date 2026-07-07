import { supabase } from "./supabase";
import {
  loadAnagraficaCliente,
  anagraficaClienteCompleta,
  indirizzoClienteUnaRiga,
} from "./clienti";
import { aziendaSospesa } from "./connect";

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
  | "richiesto" // legacy (vecchio flusso richiesta→conferma→paga)
  | "autorizzato" // NUOVO: cliente ha pagato, fondi BLOCCATI, in attesa che l'azienda accetti
  | "confermato" // azienda ha accettato → pagamento catturato (incassato), prepara spedizione
  | "rifiutato" // azienda non ha accettato → autorizzazione annullata (nessun addebito)
  | "spedito" // azienda ha spedito il pacco
  // stati legacy del vecchio flusso, non più prodotti ma tollerati in lettura
  | "controproposta"
  | "accettato"
  | "annullato"
  | "pagato";

export type OrdineShop = {
  id: string;
  owner: string;
  clienteUserId: string;
  clienteNome: string | null;
  clienteEmail: string | null;
  /** indirizzo di spedizione + telefono + codice fiscale raccolti al checkout (per fattura) */
  indirizzoSpedizione: string | null;
  telefono: string | null;
  codiceFiscale: string | null;
  aziendaNome: string | null;
  portale: string | null;
  articoli: ArticoloOrdine[];
  controproposta: ArticoloOrdine[] | null;
  stato: StatoOrdineShop;
  nota: string | null;
  /** numero ordine consecutivo per azienda + anno (es. 1 → "0001/2026"). Assegnato
   *  dal trigger DB quando l'ordine diventa "autorizzato" (pagato). */
  numeroProgressivo: number | null;
  numeroAnno: number | null;
  createdAt?: string;
};

/** "0001/2026" a partire dai campi numero. Vuoto se non ancora assegnato. */
export function numeroOrdineFmt(o: {
  numeroProgressivo: number | null;
  numeroAnno: number | null;
}): string {
  if (!o.numeroProgressivo || !o.numeroAnno) return "";
  return `${String(o.numeroProgressivo).padStart(4, "0")}/${o.numeroAnno}`;
}

/** data + ora leggibili dell'ordine (es. "07/07/2026, 14:30"). */
export function dataOraOrdine(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

type Row = {
  id: string;
  owner: string;
  cliente_user_id: string;
  cliente_nome: string | null;
  cliente_email: string | null;
  indirizzo_spedizione: string | null;
  telefono: string | null;
  codice_fiscale: string | null;
  azienda_nome: string | null;
  portale: string | null;
  articoli: ArticoloOrdine[] | null;
  controproposta: ArticoloOrdine[] | null;
  stato: StatoOrdineShop;
  nota: string | null;
  numero_progressivo: number | null;
  numero_anno: number | null;
  created_at?: string;
};

const fromRow = (r: Row): OrdineShop => ({
  id: r.id,
  owner: r.owner,
  clienteUserId: r.cliente_user_id,
  clienteNome: r.cliente_nome,
  clienteEmail: r.cliente_email,
  indirizzoSpedizione: r.indirizzo_spedizione ?? null,
  telefono: r.telefono ?? null,
  codiceFiscale: r.codice_fiscale ?? null,
  aziendaNome: r.azienda_nome,
  portale: r.portale,
  articoli: r.articoli ?? [],
  controproposta: r.controproposta ?? null,
  stato: r.stato,
  nota: r.nota,
  numeroProgressivo: r.numero_progressivo ?? null,
  numeroAnno: r.numero_anno ?? null,
  createdAt: r.created_at,
});

/** Crea un ordine dal carrello (uno per produttore). */
export async function createOrdineShop(input: {
  owner: string;
  aziendaNome: string;
  portale: string;
  articoli: ArticoloOrdine[];
}): Promise<{ id?: string; error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Accedi come cliente per ordinare." };
  // azienda sospesa (contestazione/insoluto) → vendite bloccate
  if (await aziendaSospesa(input.owner)) {
    return { error: "Questa azienda è momentaneamente sospesa e non può ricevere ordini." };
  }
  // anagrafica cliente obbligatoria + snapshot sull'ordine (per fattura/spedizione)
  const anag = await loadAnagraficaCliente();
  if (!anagraficaClienteCompleta(anag)) {
    return { error: "Completa prima i tuoi dati (anagrafica) per ordinare." };
  }
  const { data, error } = await supabase
    .from("ordini_shop")
    .insert({
      owner: input.owner,
      cliente_user_id: user.id,
      cliente_email: user.email ?? null,
      cliente_nome: anag.nome || (user.user_metadata?.nome as string) || user.email || null,
      codice_fiscale: anag.codiceFiscale || null,
      indirizzo_spedizione: indirizzoClienteUnaRiga(anag) || null,
      telefono: anag.telefono || null,
      azienda_nome: input.aziendaNome,
      portale: input.portale,
      articoli: input.articoli,
      stato: "richiesto",
    })
    .select("id")
    .single();
  return { id: (data as { id?: string } | null)?.id, error: error?.message };
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

// chiama una edge function con il token utente (verifica i permessi lato server)
async function callOrdineFn(
  fn: string,
  body: Record<string, unknown>,
): Promise<{ error?: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: "Accedi per continuare." };
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return { error: "Configurazione mancante." };
  try {
    const res = await fetch(`${base}/functions/v1/${fn}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) return { error: data.error || "Operazione non riuscita." };
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/* --- azioni dell'azienda sull'ordine PAGATO (autorizzato) --- */
// ACCETTA → cattura il pagamento (incasso) + avvisa il cliente
export const confermaOrdineShop = (id: string) => callOrdineFn("ordine-accetta", { ordineId: id });
// NON ACCETTA → annulla l'autorizzazione (nessun addebito) + motivazione al cliente
export const rifiutaOrdineShop = (id: string, motivo?: string) =>
  callOrdineFn("ordine-rifiuta", { ordineId: id, motivo: motivo ?? "" });

/* --- rete di sicurezza lato cliente --- */
// Al RITORNO dal pagamento Stripe (success_url con ?sid=…): verifica la sessione
// e sblocca l'ordine a "autorizzato", anche se il webhook non è arrivato. Best-effort.
export const verificaOrdineShop = (sessionId: string) =>
  callOrdineFn("verify-ordine-shop", { sessionId });

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

/** L'azienda segna un ordine pagato come SPEDITO: avvisa il cliente (mail) e
 *  notifica l'admin con il tempo di risposta. Verifica i permessi lato server. */
export async function segnaOrdineSpedito(ordineId: string): Promise<{ error?: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: "Accedi per continuare." };
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return { error: "Configurazione mancante." };
  try {
    const res = await fetch(`${base}/functions/v1/ordine-spedito`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ ordineId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) return { error: data.error || "Operazione non riuscita." };
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}
