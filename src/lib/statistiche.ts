import { supabase } from "./supabase";

const GIORNO_MS = 24 * 60 * 60 * 1000;

export type EventoStat = "visita" | "indicazioni" | "contatto";

/**
 * Registra una VISITA alla scheda (fire-and-forget): non deve mai bloccare la
 * pagina pubblica. `zona` = area di chi guarda (per la statistica provenienza).
 */
export async function registraVisita(
  owner: string,
  opts?: { prodottoId?: string; zona?: string },
): Promise<void> {
  if (!owner) return;
  try {
    const { error } = await supabase.from("biofido_visite").insert({
      owner,
      prodotto_id: opts?.prodottoId ?? null,
      evento: "visita",
      zona: opts?.zona ?? null,
    });
    // se le colonne evento/zona non esistono ancora, registro la visita base
    if (error) {
      await supabase.from("biofido_visite").insert({ owner, prodotto_id: opts?.prodottoId ?? null });
    }
  } catch {
    /* best effort */
  }
}

/** Registra un'AZIONE del visitatore: clic su indicazioni o sui contatti. */
export async function registraEvento(owner: string, evento: "indicazioni" | "contatto"): Promise<void> {
  if (!owner) return;
  try {
    await supabase.from("biofido_visite").insert({ owner, evento });
  } catch {
    /* best effort: se la colonna evento non esiste, l'azione non viene contata */
  }
}

export type Statistiche = {
  totale: number;
  ultimi7: number;
  ultimi30: number;
  /** conteggio per ciascuno degli ultimi 30 giorni (dal più vecchio al più recente) */
  perGiorno: { giorno: string; n: number }[];
  /** azioni del visitatore negli ultimi 30 giorni (Gold) */
  azioni: { indicazioni: number; contatto: number };
  /** provenienza dei visitatori, ultimi 30 giorni, dalle più frequenti (Gold) */
  provenienza: { zona: string; n: number }[];
};

type Riga = { created_at: string; evento?: string | null; zona?: string | null };

/** Statistiche dell'azienda loggata (RLS: vede solo le sue). */
export async function caricaStatistiche(owner: string): Promise<Statistiche> {
  const ora = Date.now();
  const da30 = new Date(ora - 30 * GIORNO_MS).toISOString();
  const soglia7 = ora - 7 * GIORNO_MS;

  // righe ultimi 30 giorni; se le colonne evento/zona non esistono ancora, ripiego
  let righe: Riga[] = [];
  let conColonne = true;
  const full = await supabase
    .from("biofido_visite")
    .select("created_at, evento, zona")
    .eq("owner", owner)
    .gte("created_at", da30);
  if (full.error) {
    conColonne = false;
    const base = await supabase
      .from("biofido_visite")
      .select("created_at")
      .eq("owner", owner)
      .gte("created_at", da30);
    righe = (base.data as Riga[]) ?? [];
  } else {
    righe = (full.data as Riga[]) ?? [];
  }

  const isVisita = (r: Riga) => !conColonne || !r.evento || r.evento === "visita";
  const visite30 = righe.filter(isVisita);

  // totale visite (all-time)
  let totaleQ = supabase
    .from("biofido_visite")
    .select("*", { count: "exact", head: true })
    .eq("owner", owner);
  if (conColonne) totaleQ = totaleQ.eq("evento", "visita");
  const { count } = await totaleQ;

  const perMap = new Map<string, number>();
  let ultimi7 = 0;
  for (const r of visite30) {
    if (new Date(r.created_at).getTime() >= soglia7) ultimi7++;
    const g = r.created_at.slice(0, 10);
    perMap.set(g, (perMap.get(g) ?? 0) + 1);
  }
  const perGiorno: { giorno: string; n: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const g = new Date(ora - i * GIORNO_MS).toISOString().slice(0, 10);
    perGiorno.push({ giorno: g, n: perMap.get(g) ?? 0 });
  }

  // azioni di contatto (ultimi 30 giorni)
  let indicazioni = 0;
  let contatto = 0;
  for (const r of righe) {
    if (r.evento === "indicazioni") indicazioni++;
    else if (r.evento === "contatto") contatto++;
  }

  // provenienza (visite ultimi 30 giorni, zone più frequenti)
  const zoneMap = new Map<string, number>();
  for (const r of visite30) {
    if (r.zona) zoneMap.set(r.zona, (zoneMap.get(r.zona) ?? 0) + 1);
  }
  const provenienza = [...zoneMap.entries()]
    .map(([zona, n]) => ({ zona, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 6);

  return {
    totale: count ?? 0,
    ultimi7,
    ultimi30: visite30.length,
    perGiorno,
    azioni: { indicazioni, contatto },
    provenienza,
  };
}
