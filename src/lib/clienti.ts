import { supabase } from "./supabase";

/**
 * Anagrafica del CLIENTE (chi ordina/prenota), in tabella dedicata `clienti`.
 * Obbligatoria prima di ordinare/prenotare: l'azienda deve poter emettere fattura
 * e contattare il cliente. La scheda viene poi "fotografata" sull'ordine/prenotazione.
 */
export type AnagraficaCliente = {
  nome: string;
  codiceFiscale: string;
  indirizzo: string;
  cap: string;
  citta: string;
  provincia: string;
  telefono: string;
};

const VUOTA: AnagraficaCliente = {
  nome: "",
  codiceFiscale: "",
  indirizzo: "",
  cap: "",
  citta: "",
  provincia: "",
  telefono: "",
};

type Row = {
  nome: string | null;
  codice_fiscale: string | null;
  indirizzo: string | null;
  cap: string | null;
  citta: string | null;
  provincia: string | null;
  telefono: string | null;
};

/** Carica l'anagrafica del cliente loggato (vuota se non compilata). */
export async function loadAnagraficaCliente(): Promise<AnagraficaCliente> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ...VUOTA };
  const { data } = await supabase
    .from("clienti")
    .select("nome, codice_fiscale, indirizzo, cap, citta, provincia, telefono")
    .eq("user_id", user.id)
    .maybeSingle();
  const r = data as Row | null;
  if (!r) return { ...VUOTA };
  return {
    nome: r.nome ?? "",
    codiceFiscale: r.codice_fiscale ?? "",
    indirizzo: r.indirizzo ?? "",
    cap: r.cap ?? "",
    citta: r.citta ?? "",
    provincia: r.provincia ?? "",
    telefono: r.telefono ?? "",
  };
}

/** Salva (upsert) l'anagrafica del cliente loggato. */
export async function saveAnagraficaCliente(a: AnagraficaCliente): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Accedi per salvare i tuoi dati." };
  const { error } = await supabase.from("clienti").upsert({
    user_id: user.id,
    nome: a.nome.trim() || null,
    codice_fiscale: a.codiceFiscale.trim().toUpperCase() || null,
    indirizzo: a.indirizzo.trim() || null,
    cap: a.cap.trim() || null,
    citta: a.citta.trim() || null,
    provincia: a.provincia.trim().toUpperCase() || null,
    telefono: a.telefono.trim() || null,
    updated_at: new Date().toISOString(),
  });
  return { error: error?.message };
}

/** true se l'anagrafica ha i campi minimi per fatturare e spedire/contattare. */
export function anagraficaClienteCompleta(a: AnagraficaCliente | null | undefined): boolean {
  if (!a) return false;
  return Boolean(
    a.nome.trim() &&
      a.codiceFiscale.trim().length >= 11 &&
      a.indirizzo.trim() &&
      a.cap.trim() &&
      a.citta.trim(),
  );
}

/** Indirizzo in una riga, per snapshot/email: "Via X 1, 16100 Genova (GE)". */
export function indirizzoClienteUnaRiga(a: AnagraficaCliente): string {
  return [a.indirizzo, [a.cap, a.citta].filter(Boolean).join(" "), a.provincia ? `(${a.provincia})` : ""]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");
}
