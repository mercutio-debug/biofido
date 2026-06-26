import { supabase } from "./supabase";
import type { Plan } from "./categories";
import { geocode } from "./geo";

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

/**
 * Forza la ri-sincronizzazione della scheda BioFido di un'azienda (per owner):
 * ricopia prodotti+ingredienti(geocodificati)+in_shop ecc. su biofido_businesses,
 * così semaforo e carrello compaiono anche su BioFido senza che il titolare debba
 * riaprire la sua dashboard. Verifica i permessi admin lato server.
 */
export async function adminResyncBiofido(
  owner: string,
  aziendaId?: string,
): Promise<{ ok?: boolean; error?: string; prodotti?: number }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: "Non autenticato" };

  // Geocodifico le origini degli ingredienti NEL BROWSER (DB città + fallback OSM):
  // Nominatim lato server (datacenter Supabase) spesso fallisce → senza coordinate
  // niente semaforo. Passo le coordinate pronte alla funzione (geocache).
  const geo = async (name: string): Promise<{ lat: number; lon: number } | null> => {
    const local = geocode(name);
    if (local) return { lat: local.lat, lon: local.lon };
    try {
      const url =
        "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=it&q=" +
        encodeURIComponent(name);
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const arr = (await res.json()) as { lat?: string; lon?: string }[];
      const hit = Array.isArray(arr) ? arr[0] : null;
      return hit?.lat ? { lat: parseFloat(hit.lat), lon: parseFloat(hit.lon as string) } : null;
    } catch {
      return null;
    }
  };

  const geocache: Record<string, { lat: number; lon: number }> = {};
  if (aziendaId) {
    try {
      const { data: pr } = await supabase
        .from("prodotti")
        .select("id")
        .eq("azienda_id", aziendaId);
      const ids = ((pr as { id: string }[]) ?? []).map((p) => p.id);
      if (ids.length) {
        const { data: ing } = await supabase
          .from("ingredienti")
          .select("origine")
          .in("prodotto_id", ids);
        const origini = Array.from(
          new Set(
            ((ing as { origine: string }[]) ?? [])
              .map((r) => (r.origine ?? "").trim())
              .filter(Boolean),
          ),
        );
        for (const o of origini) {
          const g = await geo(o);
          if (g) geocache[o.toLowerCase()] = g;
        }
      }
    } catch {
      /* best-effort: se fallisce, la funzione riprova lato server */
    }
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-resync-biofido`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ owner, geocache }),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "Re-sync non riuscito" };
  return { ok: true, prodotti: data.prodotti };
}
