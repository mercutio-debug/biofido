import { createClient } from "@supabase/supabase-js";

// Client Supabase lato browser. URL e chiave anon sono PUBBLICI (pensati per
// essere usati nel frontend); la sicurezza è garantita dalle policy RLS sul DB.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // In build/CI questi valori arrivano dalle variabili d'ambiente.
  console.warn("Supabase: variabili NEXT_PUBLIC_SUPABASE_* mancanti.");
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Email dell'amministratore (vede tutte le schede). Deve coincidere con la
// policy RLS lato database.
export const ADMIN_EMAIL = "mauriziocapitelli@yahoo.it";
