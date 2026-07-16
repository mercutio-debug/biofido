// Edge Function "onboarding-pubblica": all'APPROVAZIONE FINALE dell'azienda,
// scrive i prodotti della bozza (onboarding_bozza) nella scheda REALE del portale
// dell'azienda (BioFido → JSON biofido_businesses.products; ECO-VISA → tabelle
// prodotti + ingredienti). Le origini vengono geocodificate best-effort per il
// semaforo. Finché non si arriva qui, i dati pubblici NON vengono toccati.
//
// Chiamata solo dall'azienda loggata che ha l'onboarding. La visibilità pubblica
// resta gestita dal flusso approveShop (shop_approvato) + stato onboarding.
//
// SEGRETI: (nessuno oltre a service role)
// Deploy: supabase functions deploy onboarding-pubblica

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type MP = { nome: string; origine: string };
type Bozza = {
  nome: string;
  categoria: string;
  descrizione: string;
  descrizione_fornita: boolean;
  materie_prime: MP[];
  foto_url?: string | null;
};

const geoCache = new Map<string, { lat: number; lon: number } | null>();
async function geocode(name: string): Promise<{ lat: number; lon: number } | null> {
  const k = (name ?? "").toLowerCase().trim();
  if (!k) return null;
  if (geoCache.has(k)) return geoCache.get(k) ?? null;
  await new Promise((r) => setTimeout(r, 1100)); // rispetto rate-limit Nominatim
  try {
    const url =
      "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=it&q=" +
      encodeURIComponent(name);
    const res = await fetch(url, { headers: { "User-Agent": "ECO-VISA-BioFido/1.0 (onboarding)" } });
    const arr = (await res.json()) as { lat?: string; lon?: string }[];
    const hit =
      Array.isArray(arr) && arr[0]?.lat
        ? { lat: parseFloat(arr[0].lat), lon: parseFloat(arr[0].lon as string) }
        : null;
    geoCache.set(k, hit);
    return hit;
  } catch {
    geoCache.set(k, null);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metodo non consentito" }, 405);

  try {
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return json({ error: "Accedi per pubblicare." }, 401);

    const { data: bz } = await admin
      .from("onboarding_bozza")
      .select("prodotti, portale")
      .eq("owner", user.id)
      .maybeSingle();
    const prodotti: Bozza[] = (bz?.prodotti as Bozza[]) ?? [];
    if (!prodotti.length) return json({ error: "Nessun prodotto in bozza da pubblicare." }, 400);
    const isBio = String(bz?.portale ?? "").includes("Bio");

    let creati = 0;

    if (isBio) {
      // BIOFIDO: append al JSON products di biofido_businesses
      const { data: biz } = await admin
        .from("biofido_businesses")
        .select("products")
        .eq("owner", user.id)
        .maybeSingle();
      const esistenti = (biz?.products as unknown[] | null) ?? [];
      const nuovi = [];
      for (const p of prodotti) {
        const ingredients = [];
        for (const mp of p.materie_prime ?? []) {
          if (!mp.origine?.trim()) continue;
          const g = await geocode(mp.origine);
          ingredients.push({ nome: mp.nome, origine: mp.origine, ...(g ? { lat: g.lat, lon: g.lon } : {}) });
        }
        nuovi.push({
          name: p.nome,
          ...(p.categoria ? { category: p.categoria } : {}),
          ...(p.descrizione ? { description: p.descrizione } : {}),
          ...(p.foto_url ? { image: p.foto_url } : {}),
          ...(ingredients.length ? { ingredients } : {}),
        });
        creati++;
      }
      await admin
        .from("biofido_businesses")
        .update({ products: [...esistenti, ...nuovi] })
        .eq("owner", user.id);
    } else {
      // ECO-VISA: inserisco righe prodotti + ingredienti (con lat/lon)
      const { data: az } = await admin
        .from("aziende")
        .select("id, citta_sede")
        .eq("owner", user.id)
        .maybeSingle();
      if (!az) return json({ error: "Scheda azienda non trovata." }, 404);
      const citta = (az as { citta_sede?: string }).citta_sede ?? "";
      for (const p of prodotti) {
        const { data: pr } = await admin
          .from("prodotti")
          .insert({
            azienda_id: (az as { id: string }).id,
            nome: p.nome,
            categoria: p.categoria || null,
            stabilimento_citta: citta,
            ...(p.descrizione ? { descrizione: p.descrizione } : {}),
            ...(p.foto_url ? { immagine: p.foto_url } : {}),
          })
          .select("id")
          .single();
        if (!pr) continue;
        for (const mp of p.materie_prime ?? []) {
          if (!mp.origine?.trim()) continue;
          const g = await geocode(mp.origine);
          await admin.from("ingredienti").insert({
            prodotto_id: (pr as { id: string }).id,
            nome: mp.nome,
            origine: mp.origine,
            ...(g ? { lat: g.lat, lon: g.lon } : {}),
          });
        }
        creati++;
      }
    }

    // bozza consumata: la svuoto (i prodotti ora sono nella scheda reale)
    await admin.from("onboarding_bozza").delete().eq("owner", user.id);

    return json({ ok: true, creati });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
