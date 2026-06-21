// Ricalcolo AUTOREVOLE dell'importo di un ORDINE di prodotto, lato server.
// Il prezzo unitario è riletto dalla fonte (catalogo.prezzo) e la commissione
// dal PIANO reale del venditore (subscriptions): il client non è fonte di verità.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { euroToCents } from "./booking-amount.ts";

/** Commissione per piano (allineata a lib/categories.ts / lib/piani.ts). */
const COMMISSION_RATE: Record<string, number> = {
  free: 0,
  silver: 0.15,
  gold: 0.08,
};

export type OrderAmountResult = {
  /** prezzo unitario in centesimi */
  unitCents: number;
  /** totale = unitario × quantità, in centesimi */
  totaleCents: number;
  /** commissione piattaforma in centesimi */
  commissioneCents: number;
  /** tasso di commissione applicato (es. 0.08) */
  rate: number;
  /** piano del venditore */
  plan: string;
};

export async function computeOrderAmount(
  admin: SupabaseClient,
  prodottoId: string,
  owner: string,
  quantita: number,
): Promise<OrderAmountResult> {
  const qty = Math.max(1, Number(quantita) || 1);

  const { data: prod } = await admin
    .from("catalogo")
    .select("prezzo")
    .eq("id", prodottoId)
    .maybeSingle();
  const unitCents = prod?.prezzo != null ? euroToCents(prod.prezzo) : 0;
  const totaleCents = unitCents * qty;

  const { data: sub } = await admin
    .from("subscriptions")
    .select("plan")
    .eq("user_id", owner)
    .maybeSingle();
  const plan = (sub?.plan as string) ?? "free";
  const rate = COMMISSION_RATE[plan] ?? 0;
  const commissioneCents = Math.round(totaleCents * rate);

  return { unitCents, totaleCents, commissioneCents, rate, plan };
}
