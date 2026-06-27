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
  /** giorni della settimana in cui si svolge (1=lun … 7=dom). Vuoto = qualsiasi giorno. */
  giorniSettimana?: number[];
  /** orario fisso "HH:MM" deciso dall'azienda. Vuoto = orario libero per il cliente. */
  orario?: string;
  /** lingue in cui si svolge l'attività (codici ISO, es. ["it","en"]); per i turisti */
  lingue?: string[];
  /** foto dell'esperienza */
  immagine?: string;
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
  giorni_settimana: number[] | null;
  orario: string | null;
  lingue: string[] | null;
  immagine: string | null;
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
  giorniSettimana: r.giorni_settimana ?? undefined,
  orario: r.orario ?? undefined,
  lingue: r.lingue && r.lingue.length ? r.lingue : undefined,
  immagine: r.immagine ?? undefined,
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
  const payload: Record<string, unknown> = {
    owner,
    titolo: e.titolo,
    descrizione: e.descrizione || null,
    prezzo_cents: e.prezzoCents,
    durata_min: e.durataMin ?? null,
    max_persone: e.maxPersone,
    attiva: e.attiva,
    giorni_settimana: e.giorniSettimana && e.giorniSettimana.length ? e.giorniSettimana : null,
    orario: e.orario || null,
    lingue: e.lingue && e.lingue.length ? e.lingue : null,
    immagine: e.immagine || null,
  };
  let { error } = await supabase.from("esperienze").insert(payload);
  // se le colonne nuove non esistono ancora nel DB, le tolgo e riprovo
  if (error && /giorni_settimana|orario|lingue|immagine/i.test(error.message)) {
    delete payload.giorni_settimana;
    delete payload.orario;
    delete payload.lingue;
    delete payload.immagine;
    ({ error } = await supabase.from("esperienze").insert(payload));
  }
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
  titolo?: string | null;
  esperienze?: { titolo: string } | null;
};

const fromBookRow = (r: BookRow): Booking => ({
  id: String(r.id),
  esperienzaId: r.esperienza_id != null ? String(r.esperienza_id) : "",
  titolo: r.titolo ?? r.esperienze?.titolo,
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
  /** orario richiesto "HH:MM" (fisso se l'azienda l'ha imposto, altrimenti scelto dal cliente) */
  orario?: string;
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

  const payload: Record<string, unknown> = {
    esperienza_id: input.esperienza.id,
    owner: input.esperienza.owner,
    cliente_user_id: session?.user.id ?? null,
    cliente_nome: input.clienteNome,
    cliente_email: input.clienteEmail,
    cliente_tel: input.clienteTel || null,
    data_richiesta: input.dataRichiesta,
    orario_richiesto: input.orario || null,
    persone: input.persone,
    note: input.note || null,
    totale_cents: totaleCents,
    commissione_rate: PLAN_MAP[input.ownerPlan].commissionRate,
    commissione_cents: commCents,
    stato: "in_attesa",
  };
  let { error } = await supabase.from("prenotazioni").insert(payload);
  if (error && /orario_richiesto/i.test(error.message)) {
    delete payload.orario_richiesto;
    ({ error } = await supabase.from("prenotazioni").insert(payload));
  }
  return { error: error?.message, totaleCents };
}

/**
 * Richiesta di prenotazione per un SERVIZIO del catalogo (non legato a una
 * "esperienza"): scrive direttamente in `prenotazioni` con il titolo del
 * servizio e l'importo. Il flusso poi è identico: il produttore conferma e il
 * cliente paga (booking-pay usa `totale_cents`). esperienza_id resta null.
 */
export async function createServizioBooking(input: {
  ownerId: string;
  ownerPlan: Plan;
  servizioNome: string;
  prezzoCents: number;
  /** id del prodotto nel listino: il pagamento ricalcola l'importo dalla fonte */
  prodottoId?: string;
  /** id della voce di catalogo (servizio): idem, per il ricalcolo lato server */
  voceId?: string;
  clienteNome: string;
  clienteEmail: string;
  clienteTel?: string;
  dataRichiesta: string;
  persone: number;
  note?: string;
}): Promise<{ error?: string }> {
  const totaleCents = input.prezzoCents * Math.max(1, input.persone);
  const commCents = commissionCents(input.ownerPlan, totaleCents);
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const { error } = await supabase.from("prenotazioni").insert({
    esperienza_id: null,
    prodotto_id: input.prodottoId ?? null,
    voce_id: input.voceId ?? null,
    titolo: input.servizioNome,
    owner: input.ownerId,
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
  return { error: error?.message };
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
