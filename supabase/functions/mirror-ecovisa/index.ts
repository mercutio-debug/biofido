// Edge Function "mirror-ecovisa": sincronizzazione BioFido → ECO-VISA.
//
// Una scheda NATIVA BioFido (biofido_businesses) che ha spuntato "Pubblica anche
// su ECO-VISA" viene RISPECCHIATA nelle tabelle ECO-VISA (aziende + prodotti +
// ingredienti), così compare sulla mappa/vetrina ECO-VISA. Solo i prodotti che il
// titolare ha marcato `pubblicaEcovisa` E che hanno il semaforo (ingredienti con
// origine) vengono pubblicati: su ECO-VISA il semaforo è obbligatorio.
//
// Principio "ognuno possiede i suoi nativi":
//  - la riga aziende creata qui è marcata origine='biofido' (copia-specchio).
//  - se l'owner ha GIÀ un'azienda nativa ECO-VISA (origine='ecovisa'), NON tocco
//    nulla: quella è la sua casa, e il flusso ECO-VISA→BioFido la gestisce già.
//  - togliendo la spunta (o togliendo il semaforo a tutti i prodotti), la copia
//    viene RIMOSSA da ECO-VISA.
//
// Sicurezza: gira come l'utente loggato (può specchiare SOLO la propria scheda).
// service-role per scrivere su prodotti/ingredienti senza ambiguità di RLS.
// Deploy: npx supabase functions deploy mirror-ecovisa --project-ref kvpxnxsjiyiixqksinzr

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

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

/** "€ 15,00" / "15,00 €" → "15,00" (ECO-VISA salva il prezzo SENZA simbolo). */
function prezzoNudo(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).replace(/[^\d.,]/g, "").trim();
  return s || null;
}

type Ingr = { nome?: string; origine?: string };
type Prod = {
  name?: string;
  category?: string;
  price?: string;
  description?: string;
  image?: string;
  foto2?: string;
  confezione?: string;
  contenuto?: number;
  unita?: string;
  ingredients?: Ingr[];
  mostraSemaforo?: boolean;
  pubblicaEcovisa?: boolean;
  in_shop?: boolean;
  giacenza?: number;
  giacenza_iniziale?: number;
};

/** un prodotto va su ECO-VISA solo se marcato e col semaforo (origini presenti). */
function pubblicabile(p: Prod): boolean {
  const haSemaforo = p.mostraSemaforo !== false && (p.ingredients?.length ?? 0) > 0;
  return p.pubblicaEcovisa === true && haSemaforo;
}

/** elimina la copia-specchio ECO-VISA (azienda + prodotti + ingredienti) di un owner. */
async function rimuoviSpecchio(aziendaId: string) {
  const { data: pr } = await admin.from("prodotti").select("id").eq("azienda_id", aziendaId);
  const ids = ((pr as { id: string }[]) ?? []).map((p) => p.id);
  if (ids.length) {
    await admin.from("ingredienti").delete().in("prodotto_id", ids);
    await admin.from("prodotti").delete().eq("azienda_id", aziendaId);
  }
  await admin.from("aziende").delete().eq("id", aziendaId).eq("origine", "biofido");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    // identifico chi chiama: può specchiare SOLO la propria scheda
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return json({ error: "Non autenticato" }, 401);
    const owner = user.id;

    // scheda nativa BioFido di questo owner
    const { data: biz } = await admin
      .from("biofido_businesses")
      .select("name, category, plan, lat, lon, city, address, description, website, products, pubblica_ecovisa")
      .eq("owner", owner)
      .maybeSingle();
    if (!biz) return json({ ok: true, skipped: "nessuna scheda biofido" });

    // se ha già un'azienda NATIVA ECO-VISA, non interferisco (la sua casa è ECO-VISA)
    const { data: azExist } = await admin
      .from("aziende")
      .select("id, origine")
      .eq("owner", owner)
      .maybeSingle();
    if (azExist && (azExist as { origine?: string }).origine !== "biofido") {
      return json({ ok: true, skipped: "azienda nativa ECO-VISA" });
    }
    const mirrorId = azExist ? (azExist as { id: string }).id : null;

    const b = biz as {
      name: string;
      category?: string | null;
      plan?: string | null;
      lat?: number | null;
      lon?: number | null;
      city?: string | null;
      address?: string | null;
      description?: string | null;
      website?: string | null;
      products?: Prod[] | null;
      pubblica_ecovisa?: boolean | null;
    };
    const daPubblicare = (b.products ?? []).filter(pubblicabile);

    // spunta tolta, oppure nessun prodotto pubblicabile → rimuovo la copia (se c'è)
    if (!b.pubblica_ecovisa || daPubblicare.length === 0) {
      if (mirrorId) await rimuoviSpecchio(mirrorId);
      return json({ ok: true, pubblicati: 0, rimosso: !!mirrorId });
    }

    // upsert della riga azienda-specchio
    const aziendaPayload: Record<string, unknown> = {
      owner,
      nome: b.name,
      citta_sede: b.city ?? null,
      indirizzo: b.address ?? null,
      lat: b.lat ?? null,
      lon: b.lon ?? null,
      sito_web: b.website ?? null,
      descrizione: b.description ?? null,
      // copio il piano: su ECO-VISA gating foto/prezzo/Ordina rispetta il piano reale
      plan: b.plan ?? "free",
      origine: "biofido",
    };
    let aziendaId = mirrorId;
    if (aziendaId) {
      await admin.from("aziende").update(aziendaPayload).eq("id", aziendaId);
    } else {
      const { data: ins, error: insErr } = await admin
        .from("aziende")
        .insert(aziendaPayload)
        .select("id")
        .single();
      if (insErr) return json({ error: `azienda: ${insErr.message}` }, 500);
      aziendaId = (ins as { id: string }).id;
    }

    // riscrivo i prodotti-specchio: pulisco e reinserisco solo quelli pubblicabili
    const { data: oldPr } = await admin.from("prodotti").select("id").eq("azienda_id", aziendaId);
    const oldIds = ((oldPr as { id: string }[]) ?? []).map((p) => p.id);
    if (oldIds.length) {
      await admin.from("ingredienti").delete().in("prodotto_id", oldIds);
      await admin.from("prodotti").delete().eq("azienda_id", aziendaId);
    }

    const cittaProd = b.city ?? "—";
    for (const p of daPubblicare) {
      const prodPayload: Record<string, unknown> = {
        azienda_id: aziendaId,
        nome: p.name,
        categoria: p.category ?? null,
        stabilimento_citta: cittaProd,
        prenotabile: false,
        ...(prezzoNudo(p.price) ? { prezzo: prezzoNudo(p.price) } : {}),
        ...(p.description ? { descrizione: String(p.description).slice(0, 2000) } : {}),
        ...(p.image ? { immagine: p.image } : {}),
        ...(p.foto2 ? { foto2: p.foto2 } : {}),
        ...(p.confezione ? { confezione: p.confezione } : {}),
        ...(p.contenuto != null ? { contenuto: p.contenuto } : {}),
        ...(p.unita ? { unita: p.unita } : {}),
        // se è ordinabile su BioFido lo è anche su ECO-VISA (stesso magazzino):
        // la giacenza viene poi scalata dal webhook su entrambe le tabelle.
        ...(p.in_shop
          ? {
              in_shop: true,
              giacenza: p.giacenza ?? null,
              giacenza_iniziale: p.giacenza_iniziale ?? p.giacenza ?? null,
            }
          : {}),
      };
      const { data: pr, error: prErr } = await admin
        .from("prodotti")
        .insert(prodPayload)
        .select("id")
        .single();
      if (prErr || !pr) continue; // un prodotto problematico non blocca gli altri
      const ingRows = (p.ingredients ?? [])
        .filter((i) => (i.nome ?? "").trim() && (i.origine ?? "").trim())
        .map((i) => ({ prodotto_id: (pr as { id: string }).id, nome: i.nome, origine: i.origine }));
      if (ingRows.length) await admin.from("ingredienti").insert(ingRows);
    }

    return json({ ok: true, pubblicati: daPubblicare.length });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
