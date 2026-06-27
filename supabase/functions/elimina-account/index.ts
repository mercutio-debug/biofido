// Edge Function "elimina-account": l'utente "cancella" il proprio profilo, ma in
// realtà lo ARCHIVIA (soft-delete recuperabile):
//   • la scheda azienda viene NASCOSTA dal pubblico (archiviato_il = ora) — sparisce
//     da mappa e vetrina, ma TUTTI i dati restano intatti nel database;
//   • l'accesso viene BLOCCATO (utente bannato) — non può più entrare;
//   • niente viene cancellato: l'Admin trova la scheda completa nell'archivio e può
//     RIATTIVARLA su richiesta speciale del cliente.
//
// Sicurezza: agisce SOLO sul proprio account (identificato dal JWT). service-role.
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

    const ora = new Date().toISOString();

    // 1) ARCHIVIA: nascondi la scheda dal pubblico (i dati NON vengono cancellati)
    await admin.from("aziende").update({ archiviato_il: ora }).eq("owner", uid);
    await admin.from("biofido_businesses").update({ archiviato_il: ora }).eq("owner", uid);

    // 2) BLOCCA l'accesso: l'utente non può più entrare (riattivabile dall'Admin)
    const { error } = await admin.auth.admin.updateUserById(uid, {
      ban_duration: "876000h", // ~100 anni
    });
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
