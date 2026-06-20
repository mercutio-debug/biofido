import { supabase } from "./supabase";

/**
 * "Contatta l'azienda": messaggi che un cliente (anche OSPITE, senza account)
 * invia a un'azienda dal widget pubblico. Ogni messaggio è una riga in
 * `contatti`; un Database Webhook su INSERT richiama la funzione `notify`, che
 * inoltra il messaggio all'azienda via email (così se ne accorge anche fuori dal
 * portale). L'azienda li legge nella sezione "Messaggi" della dashboard.
 */

export type Contatto = {
  id: string;
  azienda: string;
  nomeCliente: string;
  emailCliente: string;
  messaggio: string;
  tipoRichiesta: string;
  stato: "nuovo" | "gestito";
  createdAt?: string;
};

type Row = {
  id: number | string;
  azienda: string;
  nome_cliente: string;
  email_cliente: string;
  messaggio: string | null;
  tipo_richiesta: string;
  stato: "nuovo" | "gestito";
  created_at?: string;
};

const fromRow = (r: Row): Contatto => ({
  id: String(r.id),
  azienda: r.azienda,
  nomeCliente: r.nome_cliente,
  emailCliente: r.email_cliente,
  messaggio: r.messaggio ?? "",
  tipoRichiesta: r.tipo_richiesta,
  stato: r.stato,
  createdAt: r.created_at,
});

/** Invia un messaggio "contatta l'azienda" (anche da ospite). */
export async function createContatto(input: {
  azienda: string;
  nomeCliente: string;
  emailCliente: string;
  messaggio: string;
  portale?: string;
}): Promise<{ error?: string }> {
  const { error } = await supabase.from("contatti").insert({
    azienda: input.azienda,
    nome_cliente: input.nomeCliente,
    email_cliente: input.emailCliente,
    messaggio: input.messaggio,
    tipo_richiesta: "info",
    portale: input.portale ?? null,
    stato: "nuovo",
  });
  return { error: error?.message };
}

/** Messaggi di contatto ricevuti dall'azienda loggata (RLS: solo i propri). */
export async function listContatti(azienda: string): Promise<Contatto[]> {
  const { data } = await supabase
    .from("contatti")
    .select("*")
    .eq("azienda", azienda)
    .order("created_at", { ascending: false });
  return ((data as Row[]) ?? []).map(fromRow);
}

/** Segna un messaggio come gestito (o di nuovo da gestire). */
export async function setContattoGestito(id: string, gestito: boolean): Promise<void> {
  await supabase.from("contatti").update({ stato: gestito ? "gestito" : "nuovo" }).eq("id", id);
}
