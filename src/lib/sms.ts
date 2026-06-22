import { supabase } from "./supabase";

/**
 * Preferenze notifiche SMS (funzione GOLD): l'azienda chiede un SMS quando
 * riceve un ordine. Qui si salva solo la preferenza (attivo + numero); l'invio
 * vero avviene lato server in `stripe-webhook` quando arriva l'ordine, e parte
 * solo quando il fornitore SMS è collegato (segreto SMS_API_KEY).
 */
export type SmsPreferenze = { attivo: boolean; numero: string };

export async function loadSmsPreferenze(owner: string): Promise<SmsPreferenze> {
  const { data } = await supabase
    .from("sms_preferenze")
    .select("attivo, numero")
    .eq("user_id", owner)
    .maybeSingle();
  return { attivo: Boolean(data?.attivo), numero: (data?.numero as string) ?? "" };
}

export async function saveSmsPreferenze(
  owner: string,
  p: SmsPreferenze,
): Promise<{ error?: string }> {
  const { error } = await supabase.from("sms_preferenze").upsert(
    { user_id: owner, attivo: p.attivo, numero: p.numero || null, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  return { error: error?.message };
}
