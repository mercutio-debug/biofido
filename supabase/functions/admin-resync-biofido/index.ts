// Edge Function "admin-resync-biofido": l'AMMINISTRATORE forza la ri-sincronizzazione
// della scheda BioFido di un'azienda (per owner), senza dover entrare nel suo account.
// Replica lato server `syncBioFido`: legge aziende/prodotti/ingredienti, geocodifica
// le origini (Nominatim) e riscrive biofido_businesses.products con TUTTO (ingredienti
// per il semaforo, in_shop/giacenza/foto2/descrizione/categoria per il carrello).
//
// Sicurezza: gira solo se chi chiama è l'admin (email == ADMIN_EMAIL). service-role.
// Deploy: npx supabase functions deploy admin-resync-biofido --project-ref kvpxnxsjiyiixqksinzr

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const ADMIN_EMAIL = (Deno.env.get("ADMIN_EMAIL") ?? "mauriziocapitelli@yahoo.it").toLowerCase();

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** "15,00" / "€ 15,00" / "15" → "€ 15,00"; testo non numerico lasciato com'è. */
function formatPrezzo(raw: string | number | null | undefined): string {
  if (raw == null) return "";
  const s = String(raw).trim();
  if (!s) return "";
  const cleaned = s.replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  if (isNaN(n)) return s;
  return "€ " + n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// geocodifica via OpenStreetMap (cache per invocazione + rispetto del rate limit ~1/s)
const geoCache = new Map<string, { lat: number; lon: number } | null>();
async function geocode(name: string): Promise<{ lat: number; lon: number } | null> {
  const key = (name ?? "").toLowerCase().trim();
  if (!key) return null;
  if (geoCache.has(key)) return geoCache.get(key) ?? null;
  await new Promise((r) => setTimeout(r, 1100));
  try {
    const url =
      "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=it&q=" +
      encodeURIComponent(name);
    const res = await fetch(url, { headers: { "User-Agent": "ECO-VISA-BioFido/1.0 (resync)" } });
    const arr = (await res.json()) as { lat?: string; lon?: string }[];
    const hit =
      Array.isArray(arr) && arr[0]?.lat
        ? { lat: parseFloat(arr[0].lat), lon: parseFloat(arr[0].lon as string) }
        : null;
    geoCache.set(key, hit);
    return hit;
  } catch {
    geoCache.set(key, null);
    return null;
  }
}

type MP = { nome: string; origine: string; lat?: number; lon?: number };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    // chi chiama dev'essere l'amministratore
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user || (user.email ?? "").toLowerCase() !== ADMIN_EMAIL) {
      return json({ error: "Riservato all'amministratore" }, 403);
    }

    const { owner, geocache } = await req.json();
    if (!owner) return json({ error: "owner mancante" }, 400);

    // coordinate già geocodificate dal BROWSER dell'admin (affidabili): le uso come
    // sorgente primaria, evitando Nominatim lato server (spesso bloccato da datacenter).
    if (geocache && typeof geocache === "object") {
      for (const [k, v] of Object.entries(geocache as Record<string, { lat: number; lon: number }>)) {
        if (v && typeof v.lat === "number" && typeof v.lon === "number") geoCache.set(k, v);
      }
    }

    const { data: a } = await admin
      .from("aziende")
      .select("id, descrizione, sito_web, immagine")
      .eq("owner", owner)
      .maybeSingle();
    if (!a) return json({ error: "Azienda non trovata per questo owner" }, 404);

    const { data: pr } = await admin.from("prodotti").select("*").eq("azienda_id", a.id);
    const prodotti = (pr as Record<string, unknown>[]) ?? [];
    const ids = prodotti.map((p) => p.id as string);

    const ingByProd = new Map<string, MP[]>();
    if (ids.length) {
      const { data: ing } = await admin
        .from("ingredienti")
        .select("*")
        .in("prodotto_id", ids);
      for (const r of (ing as { prodotto_id: string; nome: string; origine: string; lat?: number | null; lon?: number | null }[]) ?? []) {
        // se ECO-VISA ha già le coordinate salvate le uso (affidabili); altrimenti
        // ripiego sulla geocodifica server-side (spesso bloccata nei datacenter).
        const stored =
          typeof r.lat === "number" && typeof r.lon === "number" ? { lat: r.lat, lon: r.lon } : null;
        const g = stored ?? (await geocode(r.origine));
        const arr = ingByProd.get(r.prodotto_id) ?? [];
        arr.push({ nome: r.nome, origine: r.origine, ...(g ? { lat: g.lat, lon: g.lon } : {}) });
        ingByProd.set(r.prodotto_id, arr);
      }
    }

    const products = prodotti
      .filter((p) => String(p.nome ?? "").trim())
      .map((p) => {
        const ingredients = ingByProd.get(p.id as string);
        return {
          id: p.id,
          name: p.nome,
          ...(p.prezzo ? { price: formatPrezzo(p.prezzo as string) } : {}),
          ...(p.immagine ? { image: p.immagine } : {}),
          ...(p.prenotabile ? { prenotabile: true } : {}),
          ...(ingredients && ingredients.length ? { ingredients } : {}),
          ...(p.in_shop ? { in_shop: true } : {}),
          ...(p.giacenza != null ? { giacenza: p.giacenza } : {}),
          ...(p.giacenza_iniziale != null ? { giacenza_iniziale: p.giacenza_iniziale } : {}),
          ...(p.foto2 ? { foto2: p.foto2 } : {}),
          ...(p.descrizione ? { description: p.descrizione } : {}),
          ...(p.categoria ? { category: p.categoria } : {}),
        };
      });

    const payload: Record<string, unknown> = {
      description: a.descrizione ?? null,
      website: a.sito_web ?? null,
      products: products.length ? products : null,
    };
    // la colonna immagine può non esistere su DB più vecchi → riprovo senza
    let { error } = await admin
      .from("biofido_businesses")
      .update({ ...payload, immagine: a.immagine ?? null })
      .eq("owner", owner);
    if (error) {
      ({ error } = await admin.from("biofido_businesses").update(payload).eq("owner", owner));
    }
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true, prodotti: products.length });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
