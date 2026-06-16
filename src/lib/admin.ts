import { supabase } from "./supabase";
import type { Plan } from "./categories";

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
