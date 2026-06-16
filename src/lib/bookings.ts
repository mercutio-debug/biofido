import { supabase } from "./supabase";
import { PLAN_MAP, type Plan } from "./categories";

/**
 * Motore prenotazioni (MVP): esperienze prenotabili + richieste da confermare.
 * La commissione BioFido si calcola dal piano del produttore (PLAN_MAP) e si
 * registra sulla richiesta, pronta per il regolamento via Stripe Connect.
 */

export type Experience = {
  id: string;
  owner: string;
  titolo: string;
  descrizione?: string;
  prezzoCents: number;
  durataMin?: number;
  maxPersone: number;
  attiva: boolean;
};

export type BookingStatus = "in_attesa" | "confermata" | "rifiutata" | "annullata";

export type Booking = {
  id: string;
  esperienzaId: string;
  titolo?: string;
  clienteNome: string;
  clienteEmail: string;
  clienteTel?: string;
  dataRichiesta: string;
  persone: number;
  note?: string;
  totaleCents: number;
  commissioneCents: number;
  stato: BookingStatus;
  paymentStatus: "non_pagata" | "pagata" | "rimborsata";
  createdAt?: string;
};

/* --------------------------- commissioni & formato --------------------------- */

/** Commissione (in centesimi) trattenuta da BioFido per un dato piano. */
export function commissionCents(plan: Plan, totaleCents: number): number {
  return Math.round(totaleCents * PLAN_MAP[plan].commissionRate);
}

export const euroCents = (c: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(
    c / 100,
  );

export const STATO_LABEL: Record<BookingStatus, string> = {
  in_attesa: "In attesa",
  confermata: "Confermata",
  rifiutata: "Rifiutata",
  annullata: "Annullata",
};

/* ------------------------------ esperienze (produttore) ----------------------- */

type ExpRow = {
  id: number | string;
  owner: string;
  titolo: string;
  descrizione: string | null;
  prezzo_cents: number;
  durata_min: number | null;
  max_persone: number;
  attiva: boolean;
};

const fromExpRow = (r: ExpRow): Experience => ({
  id: String(r.id),
  owner: r.owner,
  titolo: r.titolo,
  descrizione: r.descrizione ?? undefined,
  prezzoCents: r.prezzo_cents,
  durataMin: r.durata_min ?? undefined,
  maxPersone: r.max_persone,
  attiva: r.attiva,
});

export async function listMyExperiences(owner: string): Promise<Experience[]> {
  const { data } = await supabase
    .from("esperienze")
    .select("*")
    .eq("owner", owner)
    .order("created_at", { ascending: false });
  return ((data as ExpRow[]) ?? []).map(fromExpRow);
}

export async function createExperience(
  owner: string,
  e: Omit<Experience, "id" | "owner">,
): Promise<{ error?: string }> {
  const { error } = await supabase.from("esperienze").insert({
    owner,
    titolo: e.titolo,
    descrizione: e.descrizione || null,
    prezzo_cents: e.prezzoCents,
    durata_min: e.durataMin ?? null,
    max_persone: e.maxPersone,
    attiva: e.attiva,
  });
  return { error: error?.message };
}

export async function deleteExperience(id: string): Promise<void> {
  await supabase.from("esperienze").delete().eq("id", id);
}

/** Esperienze attive dei produttori indicati, raggruppate per owner. */
export async function experiencesByOwners(
  owners: string[],
): Promise<Record<string, Experience[]>> {
  const uniq = [...new Set(owners.filter(Boolean))];
  if (uniq.length === 0) return {};
  const { data } = await supabase
    .from("esperienze")
    .select("*")
    .in("owner", uniq)
    .eq("attiva", true);
  const map: Record<string, Experience[]> = {};
  for (const r of (data as ExpRow[]) ?? []) {
    const e = fromExpRow(r);
    (map[e.owner] ??= []).push(e);
  }
  return map;
}

/* ------------------------------ prenotazioni ---------------------------------- */

type BookRow = {
  id: number | string;
  esperienza_id: number | string;
  cliente_nome: string;
  cliente_email: string;
  cliente_tel: string | null;
  data_richiesta: string;
  persone: number;
  note: string | null;
  totale_cents: number;
  commissione_cents: number;
  stato: BookingStatus;
  payment_status?: "non_pagata" | "pagata" | "rimborsata" | null;
  created_at?: string;
  esperienze?: { titolo: string } | null;
};

const fromBookRow = (r: BookRow): Booking => ({
  id: String(r.id),
  esperienzaId: String(r.esperienza_id),
  titolo: r.esperienze?.titolo,
  clienteNome: r.cliente_nome,
  clienteEmail: r.cliente_email,
  clienteTel: r.cliente_tel ?? undefined,
  dataRichiesta: r.data_richiesta,
  persone: r.persone,
  note: r.note ?? undefined,
  totaleCents: r.totale_cents,
  commissioneCents: r.commissione_cents,
  stato: r.stato,
  paymentStatus: r.payment_status ?? "non_pagata",
  createdAt: r.created_at,
});

/** Crea una richiesta di prenotazione (lato cliente, anche senza login). */
export async function createBookingRequest(input: {
  esperienza: Experience;
  ownerPlan: Plan;
  clienteNome: string;
  clienteEmail: string;
  clienteTel?: string;
  dataRichiesta: string;
  persone: number;
  note?: string;
}): Promise<{ error?: string; totaleCents: number }> {
  const totaleCents = input.esperienza.prezzoCents * input.persone;
  const commCents = commissionCents(input.ownerPlan, totaleCents);
  // se il cliente è loggato, lego la prenotazione al suo account: così avrà la
  // chat in-app con il produttore. Da ospite resta gestita via email.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { error } = await supabase.from("prenotazioni").insert({
    esperienza_id: input.esperienza.id,
    owner: input.esperienza.owner,
    cliente_user_id: session?.user.id ?? null,
    cliente_nome: input.clienteNome,
    cliente_email: input.clienteEmail,
    cliente_tel: input.clienteTel || null,
    data_richiesta: input.dataRichiesta,
    persone: input.persone,
    note: input.note || null,
    totale_cents: totaleCents,
    commissione_rate: PLAN_MAP[input.ownerPlan].commissionRate,
    commissione_cents: commCents,
    stato: "in_attesa",
  });
  return { error: error?.message, totaleCents };
}

export async function listMyBookings(owner: string): Promise<Booking[]> {
  const { data } = await supabase
    .from("prenotazioni")
    .select("*, esperienze(titolo)")
    .eq("owner", owner)
    .order("created_at", { ascending: false });
  return ((data as BookRow[]) ?? []).map(fromBookRow);
}

export async function setBookingStatus(
  id: string,
  stato: BookingStatus,
): Promise<void> {
  await supabase.from("prenotazioni").update({ stato }).eq("id", id);
}

/** Prenotazioni del cliente loggato (per la sua area "Le mie prenotazioni"). */
export async function listBookingsForCustomer(userId: string): Promise<Booking[]> {
  const { data } = await supabase
    .from("prenotazioni")
    .select("*, esperienze(titolo)")
    .eq("cliente_user_id", userId)
    .order("created_at", { ascending: false });
  return ((data as BookRow[]) ?? []).map(fromBookRow);
}

/* ------------------------------ messaggi (chat) ------------------------------- */

export type Mittente = "azienda" | "cliente";

export type Message = {
  id: string;
  prenotazioneId: string;
  mittente: Mittente;
  testo: string;
  createdAt?: string;
};

type MsgRow = {
  id: number | string;
  prenotazione_id: number | string;
  mittente: Mittente;
  testo: string;
  created_at?: string;
};

const fromMsgRow = (r: MsgRow): Message => ({
  id: String(r.id),
  prenotazioneId: String(r.prenotazione_id),
  mittente: r.mittente,
  testo: r.testo,
  createdAt: r.created_at,
});

export async function listMessages(prenotazioneId: string): Promise<Message[]> {
  const { data } = await supabase
    .from("messaggi")
    .select("*")
    .eq("prenotazione_id", prenotazioneId)
    .order("created_at", { ascending: true });
  return ((data as MsgRow[]) ?? []).map(fromMsgRow);
}

export async function sendMessage(
  prenotazioneId: string,
  mittente: Mittente,
  testo: string,
): Promise<{ error?: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const { error } = await supabase.from("messaggi").insert({
    prenotazione_id: prenotazioneId,
    mittente,
    sender_id: session?.user.id ?? null,
    testo,
  });
  return { error: error?.message };
}
