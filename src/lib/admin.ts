import { supabase } from "./supabase";
import type { Plan } from "./categories";

/** Azienda iscritta con tutti i suoi dati (per la schermata admin). */
export type Company = {
  userId: string;
  email: string | null;
  createdAt: string | null;
  nome: string | null;
  /** "cliente" | "azienda" dal metadato di registrazione (può mancare sui vecchi account) */
  tipo: string | null;
  vuoleBiofido: boolean;
  emailVerificata: boolean;
  azienda: Record<string, unknown> | null;
  fatturazione: Record<string, unknown> | null;
  bio: Record<string, unknown> | null;
  business: Record<string, unknown> | null;
  plan: Plan;
  planStatus: string | null;
  prodottiEcovisa: number;
  prodottiBiofido: number;
};

/**
 * Elenco di TUTTE le aziende iscritte con tutti i dati (solo amministratore).
 * Chiama l'Edge Function admin-companies (service role, verifica i permessi).
 */
export async function adminListCompanies(): Promise<{ companies?: Company[]; error?: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: "Non autenticato" };

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-companies`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "Operazione non riuscita" };
  return { companies: data.companies ?? [] };
}

/**
 * Assegna manualmente un piano a un utente (solo amministratore).
 * Chiama l'Edge Function admin-set-plan, che verifica i permessi lato server.
 */
export async function adminSetPlan(
  email: string,
  plan: Plan,
): Promise<{ ok?: boolean; error?: string; email?: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: "Non autenticato" };

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-set-plan`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ email, plan }),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "Operazione non riuscita" };
  return { ok: true, email: data.email };
}
