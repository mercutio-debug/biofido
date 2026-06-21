// Edge Function "seller-info": restituisce l'identità LEGALE del venditore di un
// articolo del catalogo (ragione sociale, P.IVA, città/provincia), da mostrare
// all'acquirente al momento dell'ordine (obbligo di identificazione del venditore).
//
// La P.IVA NON è pubblica nella directory; qui è esposta solo per gli articoli
// in vendita e tramite service role, cioè nel contesto legittimo dell'acquisto.
//
// Deploy: supabase functions deploy seller-info --no-verify-jwt

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { catalogoId } = await req.json();
    if (!catalogoId) return json({ error: "catalogoId mancante" }, 400);

    const { data: voce } = await admin
      .from("catalogo")
      .select("owner")
      .eq("id", catalogoId)
      .maybeSingle();
    if (!voce) return json({ error: "Articolo non trovato" }, 404);

    const { data: f } = await admin
      .from("dati_fatturazione")
      .select("ragione_sociale, partita_iva, citta, provincia")
      .eq("user_id", voce.owner)
      .maybeSingle();

    if (!f) return json({ venditore: null });

    return json({
      venditore: {
        ragioneSociale: f.ragione_sociale,
        partitaIva: f.partita_iva,
        citta: f.citta,
        provincia: f.provincia,
      },
    });
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
