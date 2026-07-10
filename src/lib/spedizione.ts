import { supabase } from "./supabase";

/**
 * Regola di spedizione di un'azienda (owner). La paga il cliente al checkout, la
 * incassa l'azienda (che spedisce). Modello «a colli»: una tariffa base copre
 * fino a N pezzi (un collo/scatola); oltre, ogni collo aggiuntivo costa X. Se
 * `pezziPerCollo` è vuoto/0 la tariffa resta FISSA per ordine (comportamento
 * storico). `modalita` predispone il futuro aggregatore (Sendcloud/ShippyPro):
 * l'ordine memorizza comunque solo `spedizione_cents`, così l'innesto
 * dell'aggregatore cambierà solo la FONTE del costo, non il resto.
 */
export type SpedizioneConfig = {
  modalita: "fissa" | "aggregatore";
  /** costo base (primo collo), in centesimi */
  costoCents: number;
  /** soglia (in centesimi) oltre la quale la spedizione è gratis; null = mai gratis */
  gratisSopraCents: number | null;
  /** pezzi che entrano in un collo/scatola; null o 0 = illimitato (tariffa fissa) */
  pezziPerCollo: number | null;
  /** costo di ogni collo oltre il primo, in centesimi; null = come il costo base */
  costoColloExtraCents: number | null;
};

export const SPEDIZIONE_VUOTA: SpedizioneConfig = {
  modalita: "fissa",
  costoCents: 0,
  gratisSopraCents: null,
  pezziPerCollo: null,
  costoColloExtraCents: null,
};

type Row = {
  modalita: string | null;
  costo_cents: number | null;
  gratis_sopra_cents: number | null;
  pezzi_per_collo?: number | null;
  costo_collo_extra_cents?: number | null;
};

const fromRow = (r: Row | null): SpedizioneConfig =>
  r
    ? {
        modalita: (r.modalita as SpedizioneConfig["modalita"]) || "fissa",
        costoCents: r.costo_cents ?? 0,
        gratisSopraCents: r.gratis_sopra_cents ?? null,
        pezziPerCollo: r.pezzi_per_collo ?? null,
        costoColloExtraCents: r.costo_collo_extra_cents ?? null,
      }
    : { ...SPEDIZIONE_VUOTA };

/** Regola di spedizione di un venditore (lettura pubblica: serve al checkout). */
export async function loadSpedizioneConfig(owner: string): Promise<SpedizioneConfig> {
  if (!owner) return { ...SPEDIZIONE_VUOTA };
  // `select("*")` per resilienza: se le colonne colli non esistono ancora su DB
  // più vecchi, la lettura non fallisce (fromRow le tratta come null).
  const { data } = await supabase
    .from("spedizione_config")
    .select("*")
    .eq("owner", owner)
    .maybeSingle();
  return fromRow(data as Row | null);
}

/** Salva (upsert) la regola di spedizione dell'azienda loggata. */
export async function saveSpedizioneConfig(c: SpedizioneConfig): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Accedi per salvare la spedizione." };
  const payload: Record<string, unknown> = {
    owner: user.id,
    modalita: c.modalita,
    costo_cents: Math.max(0, Math.round(c.costoCents)),
    gratis_sopra_cents:
      c.gratisSopraCents != null ? Math.max(0, Math.round(c.gratisSopraCents)) : null,
    pezzi_per_collo:
      c.pezziPerCollo != null && c.pezziPerCollo > 0 ? Math.round(c.pezziPerCollo) : null,
    costo_collo_extra_cents:
      c.costoColloExtraCents != null ? Math.max(0, Math.round(c.costoColloExtraCents)) : null,
    updated_at: new Date().toISOString(),
  };
  let { error } = await supabase
    .from("spedizione_config")
    .upsert(payload, { onConflict: "owner" });
  // colonne colli non ancora presenti su DB più vecchi → le tolgo e riprovo
  if (error && /pezzi_per_collo|costo_collo_extra_cents/i.test(error.message)) {
    delete payload.pezzi_per_collo;
    delete payload.costo_collo_extra_cents;
    ({ error } = await supabase.from("spedizione_config").upsert(payload, { onConflict: "owner" }));
  }
  return { error: error?.message };
}

/**
 * Costo di spedizione (in centesimi) per un ordine con `subtotaleCents` di
 * prodotti e `numPezzi` articoli totali. Modello a colli:
 *   - «gratis sopra X» ha la precedenza su tutto;
 *   - senza `pezziPerCollo` → tariffa fissa (costo base);
 *   - con `pezziPerCollo` → base + (n° colli − 1) × costo collo extra,
 *     dove n° colli = ceil(numPezzi / pezziPerCollo).
 */
export function calcolaSpedizioneCents(
  config: SpedizioneConfig | null | undefined,
  subtotaleCents: number,
  numPezzi = 1,
): number {
  if (!config) return 0;
  if (config.gratisSopraCents != null && subtotaleCents >= config.gratisSopraCents) return 0;
  const base = Math.max(0, config.costoCents);
  const perCollo = config.pezziPerCollo ?? 0;
  if (perCollo <= 0 || numPezzi <= perCollo) return base;
  const numColli = Math.ceil(numPezzi / perCollo);
  const costoExtra =
    config.costoColloExtraCents != null ? Math.max(0, config.costoColloExtraCents) : base;
  return base + (numColli - 1) * costoExtra;
}

/** "€ 7,00" · "Gratis" per l'importo spedizione. */
export function spedizioneLabel(cents: number): string {
  if (cents <= 0) return "Gratis";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
}
