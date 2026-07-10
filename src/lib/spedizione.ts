import { supabase } from "./supabase";

/**
 * Regola di spedizione di un'azienda (owner). MVP: tariffa FISSA per ordine +
 * soglia «gratis sopra X». `modalita` predispone il futuro aggregatore (Sendcloud/
 * ShippyPro): l'ordine memorizza comunque solo `spedizione_cents`, così l'innesto
 * dell'aggregatore cambierà solo la FONTE del costo, non il resto.
 */
export type SpedizioneConfig = {
  modalita: "fissa" | "aggregatore";
  /** tariffa fissa per ordine, in centesimi */
  costoCents: number;
  /** soglia (in centesimi) oltre la quale la spedizione è gratis; null = mai gratis */
  gratisSopraCents: number | null;
};

export const SPEDIZIONE_VUOTA: SpedizioneConfig = {
  modalita: "fissa",
  costoCents: 0,
  gratisSopraCents: null,
};

type Row = {
  modalita: string | null;
  costo_cents: number | null;
  gratis_sopra_cents: number | null;
};

const fromRow = (r: Row | null): SpedizioneConfig =>
  r
    ? {
        modalita: (r.modalita as SpedizioneConfig["modalita"]) || "fissa",
        costoCents: r.costo_cents ?? 0,
        gratisSopraCents: r.gratis_sopra_cents ?? null,
      }
    : { ...SPEDIZIONE_VUOTA };

/** Regola di spedizione di un venditore (lettura pubblica: serve al checkout). */
export async function loadSpedizioneConfig(owner: string): Promise<SpedizioneConfig> {
  if (!owner) return { ...SPEDIZIONE_VUOTA };
  const { data } = await supabase
    .from("spedizione_config")
    .select("modalita, costo_cents, gratis_sopra_cents")
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
  const { error } = await supabase.from("spedizione_config").upsert(
    {
      owner: user.id,
      modalita: c.modalita,
      costo_cents: Math.max(0, Math.round(c.costoCents)),
      gratis_sopra_cents: c.gratisSopraCents != null ? Math.max(0, Math.round(c.gratisSopraCents)) : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner" },
  );
  return { error: error?.message };
}

/** Costo di spedizione per un sub-totale prodotti (in centesimi). */
export function calcolaSpedizioneCents(
  config: SpedizioneConfig | null | undefined,
  subtotaleCents: number,
): number {
  if (!config) return 0;
  if (config.gratisSopraCents != null && subtotaleCents >= config.gratisSopraCents) return 0;
  return Math.max(0, config.costoCents);
}

/** "€ 7,00" · "Gratis" per l'importo spedizione. */
export function spedizioneLabel(cents: number): string {
  if (cents <= 0) return "Gratis";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
}
