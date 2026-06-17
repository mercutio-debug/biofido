import { supabase } from "./supabase";

/**
 * Certificazione biologica dell'azienda. Dato condiviso tra ECO-VISA e BioFido
 * (tabella `azienda_bio`, chiave user_id): un'azienda è bio a prescindere dal
 * portale da cui si è iscritta.
 *
 * Verifica: in Italia NON esiste un'API pubblica gratuita per validare in tempo
 * reale un numero di certificazione (a differenza della P.IVA con VIES). Si
 * raccoglie quindi ente + numero + AUTOCERTIFICAZIONE di responsabilità, e si
 * conserva il dato per tracciabilità. (Estendibile in futuro: controllo per
 * singolo organismo o import periodico dall'elenco nazionale SINAB.)
 */

/** Organismi di controllo del biologico autorizzati dal MASAF (principali). */
export const ENTI_CERTIFICATORI = [
  "Bioagricert",
  "CCPB",
  "ICEA — Istituto per la Certificazione Etica e Ambientale",
  "Suolo e Salute",
  "Valoritalia",
  "Agroqualità",
  "CSQA Certificazioni",
  "Bios",
  "Ecogruppo Italia",
  "Codex",
  "QCertificazioni",
  "IMC — Istituto Mediterraneo di Certificazione",
  "Ecocert Italia",
  "CertEuropa",
  "Sidel",
  "BioAgriCoop",
  "Altro",
] as const;

export type DatiBio = {
  is_bio: boolean;
  ente_certificatore: string;
  numero_certificazione: string;
  autocertificato: boolean;
};

export const BIO_VUOTO: DatiBio = {
  is_bio: false,
  ente_certificatore: "",
  numero_certificazione: "",
  autocertificato: false,
};

/** Vero se i dati bio sono coerenti: convenzionale ok; bio richiede ente + numero + autocertificazione. */
export function bioValido(d: DatiBio): boolean {
  if (!d.is_bio) return true;
  return Boolean(
    d.ente_certificatore.trim() &&
      d.numero_certificazione.trim() &&
      d.autocertificato,
  );
}

export async function caricaDatiBio(): Promise<DatiBio | null> {
  const { data } = await supabase
    .from("azienda_bio")
    .select("is_bio, ente_certificatore, numero_certificazione, autocertificato")
    .maybeSingle();
  return (data as DatiBio) ?? null;
}

export async function salvaDatiBio(userId: string, d: DatiBio): Promise<void> {
  const payload = {
    user_id: userId,
    is_bio: d.is_bio,
    // se convenzionale, azzero i campi della certificazione
    ente_certificatore: d.is_bio ? d.ente_certificatore || null : null,
    numero_certificazione: d.is_bio ? d.numero_certificazione || null : null,
    autocertificato: d.is_bio ? d.autocertificato : false,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("azienda_bio")
    .upsert(payload, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}
