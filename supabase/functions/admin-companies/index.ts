// Edge Function "admin-companies": restituisce all'amministratore l'elenco di
// TUTTE le aziende iscritte con tutti i dati (anagrafica, fatturazione, bio,
// scheda mappa BioFido, piano attuale, conteggio prodotti). Niente segreti.
//
// Sicurezza: esegue solo se chi chiama è l'amministratore (email == ADMIN_EMAIL).
// Legge con la service-role key (bypassa la RLS) per vedere tutti gli iscritti.
//
// Deploy: supabase functions deploy admin-companies

import { createClient } from "npm:@supabase/supabase-js@2";

// CORS inline (così la funzione è un file unico, deployabile dall'editor del dashboard)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = (Deno.env.get("ADMIN_EMAIL") ?? "mauriziocapitelli@yahoo.it")
  .toLowerCase();

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// deno-lint-ignore no-explicit-any
type Row = any;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
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

    // 1) tutti gli utenti registrati (paginati)
    const users: Row[] = [];
    for (let page = 1; page <= 50; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      users.push(...data.users);
      if (data.users.length < 200) break;
    }

    // 2) dati collegati (service role → tutte le righe)
    const [az, fatt, bio, biz, subs, prod] = await Promise.all([
      admin.from("aziende").select("*"),
      admin.from("dati_fatturazione").select("*"),
      admin.from("azienda_bio").select("*"),
      admin.from("biofido_businesses").select("*"),
      admin.from("subscriptions").select("*"),
      admin.from("prodotti").select("id, azienda_id"),
    ]);

    const aziende: Row[] = az.data ?? [];
    const aziendaByOwner = new Map<string, Row>(aziende.map((a) => [a.owner, a]));
    const ownerByAziendaId = new Map<string, string>(aziende.map((a) => [a.id, a.owner]));
    const fattByUser = new Map<string, Row>((fatt.data ?? []).map((r: Row) => [r.user_id, r]));
    const bioByUser = new Map<string, Row>((bio.data ?? []).map((r: Row) => [r.user_id, r]));
    const subByUser = new Map<string, Row>((subs.data ?? []).map((r: Row) => [r.user_id, r]));
    const bizByOwner = new Map<string, Row>((biz.data ?? []).map((r: Row) => [r.owner, r]));

    // conteggio prodotti ECO-VISA per owner dell'azienda
    const prodByOwner = new Map<string, number>();
    for (const p of (prod.data ?? []) as Row[]) {
      const owner = ownerByAziendaId.get(p.azienda_id);
      if (owner) prodByOwner.set(owner, (prodByOwner.get(owner) ?? 0) + 1);
    }

    const companies = users.map((u: Row) => {
      const sub = subByUser.get(u.id);
      const business = bizByOwner.get(u.id) ?? null;
      const stato = sub?.status as string | undefined;
      const pianoAttivo = !sub || stato === "canceled" || stato === "inactive"
        ? "free"
        : (sub.plan ?? "free");
      return {
        userId: u.id,
        email: u.email ?? null,
        createdAt: u.created_at ?? null,
        nome: (u.user_metadata?.nome as string) ?? null,
        tipo: (u.user_metadata?.tipo as string) ?? null,
        vuoleBiofido: !!u.user_metadata?.vuole_biofido,
        emailVerificata: !!u.email_confirmed_at,
        azienda: aziendaByOwner.get(u.id) ?? null,
        fatturazione: fattByUser.get(u.id) ?? null,
        bio: bioByUser.get(u.id) ?? null,
        business,
        plan: pianoAttivo,
        planStatus: stato ?? null,
        prodottiEcovisa: prodByOwner.get(u.id) ?? 0,
        prodottiBiofido: Array.isArray(business?.products) ? business.products.length : 0,
      };
    });

    // ordina: prima chi ha un profilo (azienda o scheda), poi per data iscrizione
    companies.sort((a, b) => {
      const pa = a.azienda || a.business ? 1 : 0;
      const pb = b.azienda || b.business ? 1 : 0;
      if (pa !== pb) return pb - pa;
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });

    return json({ companies });
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
