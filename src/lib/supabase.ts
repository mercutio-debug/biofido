import { createClient } from "@supabase/supabase-js";

// Client Supabase lato browser. URL e chiave anon sono PUBBLICI (pensati per
// essere usati nel frontend); la sicurezza è garantita dalle policy RLS sul DB.
const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Se i segreti mancano (es. build su GitHub Pages senza secret configurati)
// usiamo valori SEGNAPOSTO: createClient va in errore con URL vuoto e
// bloccherebbe il build. Con i segnaposto il sito si compila lo stesso e
// l'app ricade automaticamente sui dati demo (vedi loadBusinesses).
export const hasSupabase = Boolean(envUrl && envKey);
if (!hasSupabase) {
  console.warn(
    "Supabase: variabili NEXT_PUBLIC_SUPABASE_* mancanti — uso i dati demo."
  );
}

const supabaseUrl = envUrl || "https://placeholder.supabase.co";
const supabaseAnonKey = envKey || "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Email dell'amministratore (vede tutte le schede). Deve coincidere con la
// policy RLS lato database.
export const ADMIN_EMAIL = "mauriziocapitelli@yahoo.it";
