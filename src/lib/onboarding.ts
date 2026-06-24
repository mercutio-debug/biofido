import { supabase } from "./supabase";

/**
 * Onboarding "Ci pensiamo noi": dopo l'acquisto del servizio extra, l'azienda
 * può caricare in autonomia listino (excel/word/pdf) e foto, che il nostro
 * operatore userà per costruirle la scheda. L'acquisto è rilevato dagli `extras`
 * salvati sull'abbonamento (webhook Stripe). I file stanno nel bucket `catalogo`
 * sotto `{uid}/onboarding/…` (la policy Storage accetta solo path che iniziano
 * con l'uid) e sono tracciati nella tabella `onboarding_files`.
 */

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB per file

export type FileOnboarding = {
  id: string;
  nome: string;
  url: string;
  tipo: string | null;
  created_at: string;
};

/** Servizi extra acquistati con l'abbonamento (es. ["onboarding","badge"]). */
export async function getMyExtras(): Promise<string[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("subscriptions")
    .select("extras")
    .eq("user_id", user.id)
    .maybeSingle();
  const raw = (data as { extras?: string | null } | null)?.extras ?? "";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

/** true se l'azienda ha acquistato l'onboarding "Ci pensiamo noi". */
export async function haiOnboarding(): Promise<boolean> {
  return (await getMyExtras()).includes("onboarding");
}

/**
 * true se c'è un onboarding IN CORSO (acquistato e non ancora "completato" dal
 * nostro team): in questo caso NON va riproposto/riacquistabile da nessuna parte
 * (checkbox servizi, banner Gold, carrello) finché non lo chiudiamo.
 */
export async function onboardingInCorso(): Promise<boolean> {
  const [extras, stato] = await Promise.all([getMyExtras(), getStatoOnboarding()]);
  return extras.includes("onboarding") && stato?.stato !== "completato";
}

/** Carica un file (listino/foto) per l'onboarding e lo registra. */
export async function caricaFileOnboarding(file: File): Promise<FileOnboarding> {
  if (file.size > MAX_BYTES) throw new Error("File troppo grande (max 25 MB).");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user?.id;
  if (!uid) throw new Error("Sessione scaduta: accedi di nuovo.");
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const path = `${uid}/onboarding/${Date.now()}-${safe}`;
  const up = await supabase.storage
    .from("catalogo")
    .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: true });
  if (up.error) throw new Error(up.error.message);
  const url = supabase.storage.from("catalogo").getPublicUrl(path).data.publicUrl;
  const ins = await supabase
    .from("onboarding_files")
    .insert({ owner: uid, nome: file.name, url, tipo: file.type || null, path })
    .select("id, nome, url, tipo, created_at")
    .single();
  if (ins.error) throw new Error(ins.error.message);
  return ins.data as FileOnboarding;
}

/** Elenco dei file caricati dall'azienda per l'onboarding. */
export async function listaFileOnboarding(): Promise<FileOnboarding[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("onboarding_files")
    .select("id, nome, url, tipo, created_at")
    .eq("owner", user.id)
    .order("created_at", { ascending: false });
  return (data as FileOnboarding[]) ?? [];
}

/* ---- Stato del processo onboarding ----------------------------------------
 * in_corso     → acquistato, l'azienda sta caricando i file
 * inviato      → l'azienda ha premuto "ho caricato tutto": tocca a noi
 * integrazioni → il nostro team ha chiesto altro materiale (nota = cosa serve)
 * completato   → abbiamo finito: l'onboarding si può riacquistare per un nuovo giro
 */
export type StatoOnboarding = "in_corso" | "inviato" | "integrazioni" | "completato";

export async function getStatoOnboarding(): Promise<{ stato: StatoOnboarding; nota: string | null } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("onboarding_stato")
    .select("stato, nota")
    .eq("owner", user.id)
    .maybeSingle();
  return (data as { stato: StatoOnboarding; nota: string | null } | null) ?? null;
}

/** L'azienda conferma di aver caricato tutto → tocca al nostro team. */
export async function confermaCaricamentoCompleto(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessione scaduta: accedi di nuovo.");
  const { error } = await supabase
    .from("onboarding_stato")
    .upsert({ owner: user.id, stato: "inviato", updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

/** (ADMIN) imposta lo stato dell'onboarding di un'azienda (RLS: solo admin). */
export async function adminSetStatoOnboarding(
  owner: string,
  stato: StatoOnboarding,
  nota?: string,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("onboarding_stato")
    .upsert({ owner, stato, nota: nota ?? null, updated_at: new Date().toISOString() });
  return error ? { error: error.message } : {};
}

/** Rimuove un file caricato (riga + oggetto nello storage). */
export async function eliminaFileOnboarding(id: string): Promise<void> {
  const { data } = await supabase
    .from("onboarding_files")
    .select("path")
    .eq("id", id)
    .maybeSingle();
  const path = (data as { path?: string } | null)?.path;
  if (path) await supabase.storage.from("catalogo").remove([path]);
  await supabase.from("onboarding_files").delete().eq("id", id);
}
