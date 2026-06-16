// Edge Function "mollie-connect-callback": Mollie reindirizza qui dopo che il
// produttore ha autorizzato. Scambia il code per un token, legge l'id
// organizzazione e segna l'account come collegato.
//
// SEGRETI: MOLLIE_CLIENT_ID, MOLLIE_CLIENT_SECRET, SUPABASE_URL, SITE_URL
// Deploy: supabase functions deploy mollie-connect-callback --no-verify-jwt

import { createClient } from "npm:@supabase/supabase-js@2";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const SITE_URL = Deno.env.get("SITE_URL") ?? "";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  try {
    if (!code || !state) throw new Error("Parametri mancanti");

    // ritrova l'utente dallo stato salvato
    const { data: acc } = await admin
      .from("mollie_accounts")
      .select("user_id")
      .eq("oauth_state", state)
      .maybeSingle();
    if (!acc) throw new Error("Stato non valido");

    // scambio code -> access token
    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/mollie-connect-callback`;
    const basic = btoa(
      `${Deno.env.get("MOLLIE_CLIENT_ID")}:${Deno.env.get("MOLLIE_CLIENT_SECRET")}`,
    );
    const tokenRes = await fetch("https://api.mollie.com/oauth2/tokens", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });
    const token = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(token?.error_description || "Token error");

    // id organizzazione del produttore
    const orgRes = await fetch("https://api.mollie.com/v2/organizations/me", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const org = await orgRes.json();
    if (!orgRes.ok) throw new Error("Organizzazione non leggibile");

    await admin
      .from("mollie_accounts")
      .update({ org_id: org.id, connected: true, oauth_state: null })
      .eq("user_id", acc.user_id);

    return redirect(`${SITE_URL}/dashboard/?mollie=ok`);
  } catch (e) {
    console.error(e);
    return redirect(`${SITE_URL}/dashboard/?mollie=errore`);
  }
});

function redirect(location: string) {
  return new Response(null, { status: 302, headers: { Location: location } });
}
