import { supabase } from "./supabase";

/**
 * Dati di fatturazione dell'impresa: servono per emettere la fattura elettronica
 * (FatturaPA via SdI) quando si attiva un piano Silver/Gold. Il Free non li
 * richiede. I prezzi a listino sono + IVA 22% (servizio B2B).
 */
export type DatiFatturazione = {
  ragione_sociale: string;
  partita_iva: string;
  codice_fiscale?: string;
  indirizzo?: string;
  cap?: string;
  citta?: string;
  provincia?: string;
  paese: string;
  codice_sdi: string; // 7 caratteri, oppure '0000000'
  pec?: string;
  email?: string;
};

export const DATI_VUOTI: DatiFatturazione = {
  ragione_sociale: "",
  partita_iva: "",
  codice_fiscale: "",
  indirizzo: "",
  cap: "",
  citta: "",
  provincia: "",
  paese: "IT",
  codice_sdi: "0000000",
  pec: "",
  email: "",
};

const SDI_RE = /^[A-Z0-9]{7}$/;
const PEC_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Verifica la coerenza del recapito fattura elettronica (SDI / PEC / 0000000). */
export function recapitoValido(d: DatiFatturazione): boolean {
  const sdi = (d.codice_sdi || "").toUpperCase();
  if (sdi && sdi !== "0000000") return SDI_RE.test(sdi);
  // 0000000 → serve almeno la PEC, altrimenti va comunque (cassetto fiscale)
  if (d.pec) return PEC_RE.test(d.pec);
  return true; // 0000000 senza PEC: consegna via cassetto fiscale del destinatario
}

/** Campi minimi per poter fatturare. */
export function datiCompleti(d: DatiFatturazione): boolean {
  return (
    d.ragione_sociale.trim().length > 1 &&
    /^\d{11}$/.test((d.partita_iva || "").replace(/\D/g, "")) &&
    recapitoValido(d)
  );
}

export async function caricaDatiFatturazione(): Promise<DatiFatturazione | null> {
  const { data } = await supabase
    .from("dati_fatturazione")
    .select(
      "ragione_sociale, partita_iva, codice_fiscale, indirizzo, cap, citta, provincia, paese, codice_sdi, pec, email",
    )
    .maybeSingle();
  return (data as DatiFatturazione) ?? null;
}

/**
 * Dati AZIENDALI del cliente per la fattura, quando il cliente ordina/prenota
 * come impresa (ha compilato la fatturazione con P.IVA valida). Null se privato.
 * Serve a "fotografare" ragione sociale/P.IVA/SDI-PEC sull'ordine, così l'azienda
 * venditrice vede a chi intestare la fattura B2B.
 */
export async function datiAziendaliCliente(): Promise<{
  ragioneSociale: string;
  partitaIva: string;
  codiceSdi: string;
  pec: string;
} | null> {
  const d = await caricaDatiFatturazione();
  if (!d || !datiCompleti(d)) return null;
  const sdi = (d.codice_sdi || "").toUpperCase();
  return {
    ragioneSociale: d.ragione_sociale.trim(),
    partitaIva: (d.partita_iva || "").replace(/\D/g, ""),
    // 0000000 = nessun recapito SDI → si usa la PEC (o cassetto fiscale)
    codiceSdi: sdi && sdi !== "0000000" ? sdi : "",
    pec: (d.pec || "").trim(),
  };
}

export async function salvaDatiFatturazione(
  userId: string,
  d: DatiFatturazione,
): Promise<void> {
  const payload = {
    user_id: userId,
    ...d,
    partita_iva: (d.partita_iva || "").replace(/\D/g, ""),
    codice_sdi: (d.codice_sdi || "0000000").toUpperCase() || "0000000",
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("dati_fatturazione")
    .upsert(payload, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

/** Autocompletamento da Partita IVA tramite la Edge Function VIES. */
export async function lookupPiva(piva: string): Promise<Partial<DatiFatturazione> | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/lookup-piva`
    : "";
  if (!url) throw new Error("Servizio non configurato.");

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Accedi per usare l'autocompletamento.");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ piva }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Lookup non riuscito.");
  if (!body.valid) return null;
  return {
    partita_iva: body.partita_iva,
    ragione_sociale: body.ragione_sociale,
    indirizzo: body.indirizzo,
    cap: body.cap,
    citta: body.citta,
    provincia: body.provincia,
    paese: body.paese ?? "IT",
  };
}
