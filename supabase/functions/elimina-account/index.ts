// Edge Function "elimina-account": l'utente cancella DEFINITIVAMENTE il proprio
// profilo. Prima di eliminarlo, salviamo uno snapshot in "profili_cancellati"
// (lo vede solo l'Admin), poi rimuoviamo l'utente da Auth (le righe legate con
// FK on delete cascade spariscono con lui).
//
// Sicurezza: cancella SOLO il proprio account (identificato dal JWT). service-role.
// Deploy: npx supabase functions deploy elimina-account --project-ref kvpxnxsjiyiixqksinzr

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "non autenticato" }, 401);

    const { data: { user }, error: uerr } = await admin.auth.getUser(token);
    if (uerr || !user) return json({ error: "non autenticato" }, 401);
    const uid = user.id;

    // doppia sicurezza: il client deve mandare la conferma esplicita
    const { conferma } = await req.json().catch(() => ({}));
    if (conferma !== "CANCELLA") return json({ error: "conferma mancante" }, 400);

    // 1) snapshot dei dati chiave PRIMA di cancellare
    const [aziende, biz, fatt] = await Promise.all([
      admin.from("aziende").select("*").eq("owner", uid),
      admin.from("biofido_businesses").select("*").eq("owner", uid),
      admin.from("dati_fatturazione").select("*").eq("user_id", uid),
    ]);
    await admin.from("profili_cancellati").insert({
      user_id: uid,
      email: user.email ?? null,
      nome: (user.user_metadata as { nome?: string } | null)?.nome ?? null,
      user_metadata: user.user_metadata ?? null,
      aziende: aziende.data ?? null,
      biofido_businesses: biz.data ?? null,
      dati_fatturazione: fatt.data ?? null,
    });

    // 2) rimuovi i dati pubblici legati (così l'azienda sparisce SUBITO dalla
    //    mappa e dalla vetrina). prodotti/ingredienti vanno via in cascata con
    //    l'azienda se le FK hanno on delete cascade.
    await admin.from("biofido_businesses").delete().eq("owner", uid);
    await admin.from("aziende").delete().eq("owner", uid);
    await admin.from("dati_fatturazione").delete().eq("user_id", uid);

    // 3) elimina l'utente da Auth
    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
