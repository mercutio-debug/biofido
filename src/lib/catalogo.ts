import { supabase } from "./supabase";
import { ridimensionaImmagine, MAX_BYTES_INGRESSO } from "./immagini";

/**
 * Catalogo vendite (funzione GOLD), condiviso tra ECO-VISA e BioFido. Prodotti
 * e servizi (visite, laboratori, esperienze) con prezzo e immagine. Lettura
 * pubblica: il widget sulla mappa/scheda ne mostra l'anteprima e permette al
 * cliente di contattare l'azienda.
 */

export type TipoVoce = "prodotto" | "visita" | "laboratorio" | "esperienza";

export const TIPI_VOCE: { id: TipoVoce; label: string; servizio: boolean }[] = [
  { id: "prodotto", label: "Prodotto", servizio: false },
  { id: "visita", label: "Visita guidata", servizio: true },
  { id: "laboratorio", label: "Laboratorio didattico", servizio: true },
  { id: "esperienza", label: "Esperienza", servizio: true },
];

export type VoceCatalogo = {
  id?: string;
  numero: number;
  nome: string;
  tipo: TipoVoce;
  prezzo: number | null;
  unita: string | null;
  descrizione: string | null;
  immagine: string | null;
  /** durata dell'attività/servizio, es. "2 ore" (per i servizi prenotabili) */
  durata?: string | null;
  /** lingue in cui si svolge l'attività (codici ISO, es. ["it","en"]); per i turisti */
  lingue?: string[] | null;
  /** seconda foto dell'attività (i servizi possono averne fino a 2) */
  foto2?: string | null;
};

export async function loadCatalogo(owner: string): Promise<VoceCatalogo[]> {
  const { data } = await supabase
    .from("catalogo")
    .select("id, numero, nome, tipo, prezzo, unita, descrizione, immagine, durata, lingue, foto2")
    .eq("owner", owner)
    .order("numero");
  return (data as VoceCatalogo[]) ?? [];
}

export async function salvaVoce(owner: string, v: VoceCatalogo): Promise<void> {
  const payload = {
    owner,
    numero: v.numero,
    nome: v.nome,
    tipo: v.tipo,
    prezzo: v.prezzo,
    unita: v.unita || null,
    descrizione: v.descrizione || null,
    immagine: v.immagine || null,
    durata: v.durata || null,
    lingue: v.lingue && v.lingue.length ? v.lingue : null,
    foto2: v.foto2 || null,
  };
  const q = v.id
    ? supabase.from("catalogo").update(payload).eq("id", v.id)
    : supabase.from("catalogo").insert(payload);
  const { error } = await q;
  if (error) throw new Error(error.message);
}

export async function eliminaVoce(id: string): Promise<void> {
  const { error } = await supabase.from("catalogo").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Carica l'immagine (ridimensionata) nel bucket `catalogo` e ritorna l'URL pubblico.
 * Il percorso DEVE iniziare con l'uid dell'utente loggato: la policy RLS dello
 * storage accetta solo `auth.uid()/...`. Per questo l'uid viene ricavato qui
 * dalla sessione e NON dal parametro `owner` (che poteva essere l'id-azienda,
 * facendo fallire silenziosamente l'upload). Il parametro resta per compatibilità.
 */
export async function caricaImmagineCatalogo(owner: string, file: File): Promise<string> {
  if (file.size > MAX_BYTES_INGRESSO) {
    throw new Error("Immagine troppo grande (max 15 MB).");
  }
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id ?? owner;
  if (!uid) throw new Error("Sessione scaduta: accedi di nuovo per caricare l'immagine.");
  const blob = await ridimensionaImmagine(file, 1280, 0.82);
  const path = `${uid}/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from("catalogo")
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(error.message);
  return supabase.storage.from("catalogo").getPublicUrl(path).data.publicUrl;
}
