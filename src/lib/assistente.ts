/**
 * Client dell'assistente virtuale (widget chat). Inoltra la conversazione alla
 * edge function `assistente`, che risponde con Claude. Funzione pubblica (visitatori
 * non loggati): passo solo l'anon key come `apikey` per il gateway Supabase.
 */
export type ChatMsg = { role: "user" | "assistant"; content: string };

export async function chiediAssistente(
  messages: ChatMsg[],
  portale: string,
): Promise<{ reply?: string; error?: string }> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base) return { error: "Configurazione mancante." };
  try {
    const res = await fetch(`${base}/functions/v1/assistente`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(anon ? { apikey: anon, Authorization: `Bearer ${anon}` } : {}),
      },
      body: JSON.stringify({ messages, portale }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) return { error: data.error || "Assistente non disponibile." };
    return { reply: data.reply };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
