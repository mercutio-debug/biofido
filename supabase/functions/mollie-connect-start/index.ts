// Edge Function "mollie-connect-start": avvia il collegamento del produttore a
// Mollie (OAuth). Restituisce l'URL di autorizzazione a cui reindirizzare.
//
// SEGRETI: MOLLIE_CLIENT_ID, SUPABASE_URL (per il redirect al callback)
// Deploy: supabase functions deploy mollie-connect-start

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SCOPES =
  "organizations.read payments.read payments.write profiles.read onboarding.read";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return json({ error: "Non autenticato" }, 401);

    // stato anti-CSRF: lo salvo e lo verifico nel callback
    const state = crypto.randomUUID();
    await supabase
      .from("mollie_accounts")
      .upsert({ user_id: user.id, oauth_state: state });

    const redirectUri = `${supabaseUrl}/functions/v1/mollie-connect-callback`;
    const url =
      `https://my.mollie.com/oauth2/authorize?client_id=${Deno.env.get("MOLLIE_CLIENT_ID")}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${state}` +
      `&scope=${encodeURIComponent(SCOPES)}` +
      `&response_type=code&approval_prompt=auto`;

    return json({ url });
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
