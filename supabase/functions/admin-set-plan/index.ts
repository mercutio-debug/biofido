// Edge Function "admin-set-plan": l'amministratore assegna manualmente un piano
// (free/silver/gold) a un utente, via email, SENZA pagamento. Utile per omaggi,
// "Amici di Fido", gestione manuale.
//
// Sicurezza: esegue solo se chi chiama è l'amministratore (email == ADMIN_EMAIL).
// Scrive con la service-role key (bypassa la RLS).
//
// SEGRETI: ADMIN_EMAIL (facoltativo; default sotto). SUPABASE_* sono automatici.
// Deploy: supabase functions deploy admin-set-plan

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const ADMIN_EMAIL = (Deno.env.get("ADMIN_EMAIL") ?? "mauriziocapitelli@yahoo.it")
  .toLowerCase();

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

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

    const { email, plan } = await req.json();
    if (!["free", "silver", "gold"].includes(plan)) {
      return json({ error: "Piano non valido" }, 400);
    }
    const target = String(email ?? "").trim().toLowerCase();
    if (!target) return json({ error: "Email mancante" }, 400);

    // trova l'utente per email (scorre le pagine)
    let found: { id: string; email?: string } | undefined;
    for (let page = 1; page <= 20 && !found; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      found = data.users.find((u) => (u.email ?? "").toLowerCase() === target);
      if (data.users.length < 200) break;
    }
    if (!found) return json({ error: "Nessun utente registrato con questa email" }, 404);

    await admin.from("subscriptions").upsert({
      user_id: found.id,
      plan,
      status: plan === "free" ? "canceled" : "active_admin",
      updated_at: new Date().toISOString(),
    });
    await admin.from("biofido_businesses").update({ plan }).eq("owner", found.id);

    return json({ ok: true, email: found.email, plan });
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
