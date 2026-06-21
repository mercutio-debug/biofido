// Ricalcolo AUTOREVOLE di importo e commissione di una prenotazione, lato
// server. NON ci si fida dei valori `totale_cents`/`commissione_cents` scritti
// dal client (un cliente malevolo potrebbe manometterli): il prezzo unitario è
// riletto dalla fonte vera (tabella `esperienze` o `prodotti`) e la commissione
// è ricalcolata dal PIANO reale del produttore (tabella `subscriptions`).
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/** Commissione BioFido per piano (deve restare allineata a lib/categories.ts). */
const COMMISSION_RATE: Record<string, number> = {
  free: 0,
  silver: 0.15,
  gold: 0.08,
};

/** "€ 15,00" / "15,00" / "15.5" / "1.200,50" → centesimi interi. */
export function euroToCents(s: string | number | null | undefined): number {
  if (s == null) return 0;
  if (typeof s === "number") return Math.round(s * 100);
  const cleaned = String(s).replace(/[^\d.,]/g, "");
  if (!cleaned) return 0;
  const lc = cleaned.lastIndexOf(",");
  const ld = cleaned.lastIndexOf(".");
  let dec = "";
  if (lc > -1 && ld > -1) dec = lc > ld ? "," : ".";
  else if (lc > -1) dec = ",";
  else if (ld > -1) dec = ".";
  let norm = cleaned;
  if (dec) {
    const th = dec === "," ? "." : ",";
    norm = cleaned.split(th).join("").replace(dec, ".");
  }
  const n = parseFloat(norm);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export type PrenotazioneAmount = {
  owner: string;
  persone: number | null;
  esperienza_id: number | string | null;
  prodotto_id: string | null;
  voce_id: string | null;
  totale_cents: number | null;
};

export type AmountResult = {
  /** importo totale da incassare, in centesimi (autorevole) */
  totaleCents: number;
  /** commissione BioFido, in centesimi (autorevole) */
  commissioneCents: number;
  /** piano del produttore usato per la commissione */
  plan: string;
  /** true se il prezzo è stato riletto dalla fonte; false = fallback al salvato */
  fromSource: boolean;
};

/**
 * Calcola gli importi autorevoli per una prenotazione.
 * - prezzo unitario: da `esperienze.prezzo_cents` o da `prodotti.prezzo`;
 * - totale = prezzo unitario × persone;
 * - commissione = totale × tasso del piano del produttore (da `subscriptions`).
 * Se manca il riferimento al listino (prenotazioni vecchie), ripiega sul
 * `totale_cents` salvato, ma la commissione resta comunque ricalcolata dal piano.
 */
export async function computeBookingAmount(
  admin: SupabaseClient,
  p: PrenotazioneAmount,
): Promise<AmountResult> {
  const persone = Math.max(1, Number(p.persone) || 1);

  let unitCents: number | null = null;
  if (p.esperienza_id != null) {
    const { data } = await admin
      .from("esperienze")
      .select("prezzo_cents")
      .eq("id", p.esperienza_id)
      .maybeSingle();
    if (data?.prezzo_cents != null) unitCents = Number(data.prezzo_cents);
  } else if (p.prodotto_id != null) {
    const { data } = await admin
      .from("prodotti")
      .select("prezzo")
      .eq("id", p.prodotto_id)
      .maybeSingle();
    if (data?.prezzo != null) unitCents = euroToCents(data.prezzo);
  } else if (p.voce_id != null) {
    const { data } = await admin
      .from("catalogo")
      .select("prezzo")
      .eq("id", p.voce_id)
      .maybeSingle();
    if (data?.prezzo != null) unitCents = euroToCents(data.prezzo);
  }

  const fromSource = unitCents != null;
  const totaleCents = fromSource
    ? unitCents! * persone
    : Math.max(0, Number(p.totale_cents) || 0);

  // commissione SEMPRE dal piano reale del produttore (mai dal client)
  const { data: sub } = await admin
    .from("subscriptions")
    .select("plan")
    .eq("user_id", p.owner)
    .maybeSingle();
  const plan = (sub?.plan as string) ?? "free";
  const rate = COMMISSION_RATE[plan] ?? 0;
  const commissioneCents = Math.round(totaleCents * rate);

  return { totaleCents, commissioneCents, plan, fromSource };
}
