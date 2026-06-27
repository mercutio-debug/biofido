import { supabase } from "./supabase";

/**
 * Cancella DEFINITIVAMENTE il proprio profilo: chiama la edge function
 * "elimina-account" che salva uno snapshot in "profili_cancellati" (visibile
 * solo all'Admin) e rimuove l'utente. Irreversibile.
 */
export async function eliminaAccount(): Promise<{ ok?: boolean; error?: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: "Sessione scaduta: accedi di nuovo e riprova." };
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/elimina-account`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ conferma: "CANCELLA" }),
      },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.error || "Impossibile cancellare l'account. Riprova." };
    return { ok: true };
  } catch {
    return { error: "Errore di rete. Riprova." };
  }
}
