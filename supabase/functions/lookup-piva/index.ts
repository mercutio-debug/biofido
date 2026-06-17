// Edge Function: dato un numero di Partita IVA italiano, interroga il servizio
// pubblico UE VIES e restituisce ragione sociale + sede legale, così il form di
// fatturazione si autocompila. Nessun segreto richiesto (VIES è gratuito), ma
// pretendiamo un utente autenticato per non esporre un proxy aperto.
//
// VIES REST: https://ec.europa.eu/taxation_customs/vies/rest-api/ms/IT/vat/{n}
// Restituisce { isValid, name, address, ... }. L'indirizzo è una stringa
// multi-riga ("VIA ... \n CAP CITTA PROV"): la spezziamo al meglio, lasciando
// all'impresa la possibilità di correggere.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Tiene solo le cifre e toglie un eventuale prefisso IT. */
function normalizzaPiva(input: string): string {
  return (input || "").toUpperCase().replace(/^IT/, "").replace(/\D/g, "");
}

/** Spezza l'indirizzo VIES in via / cap / città / provincia (best effort). */
function parseIndirizzo(address: string) {
  const righe = (address || "")
    .split("\n")
    .map((r) => r.trim())
    .filter(Boolean);
  const indirizzo = righe[0] ?? "";
  let cap = "", citta = "", provincia = "";
  const resto = righe.slice(1).join(" ");
  const m = resto.match(/(\d{5})\s+(.*?)\s+([A-Z]{2})$/);
  if (m) {
    cap = m[1];
    citta = m[2].trim();
    provincia = m[3];
  } else if (resto) {
    citta = resto;
  }
  return { indirizzo, cap, citta, provincia };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metodo non consentito" }, 405);

  try {
    // utente autenticato (così non è un proxy aperto a chiunque)
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Accesso richiesto." }, 401);

    const { piva } = await req.json().catch(() => ({ piva: "" }));
    const num = normalizzaPiva(piva);
    if (num.length !== 11) {
      return json({ error: "La Partita IVA deve avere 11 cifre." }, 400);
    }

    const r = await fetch(
      `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/IT/vat/${num}`,
      { headers: { Accept: "application/json" } },
    );
    if (!r.ok) {
      return json({ error: "Servizio VIES non raggiungibile, riprova più tardi." }, 502);
    }
    const v = await r.json();

    if (!v.isValid) {
      return json({ valid: false, message: "Partita IVA non trovata nel registro VIES." });
    }

    const nome = (v.name && v.name !== "---") ? String(v.name).trim() : "";
    const { indirizzo, cap, citta, provincia } = parseIndirizzo(
      v.address && v.address !== "---" ? String(v.address) : "",
    );

    return json({
      valid: true,
      partita_iva: num,
      ragione_sociale: nome,
      indirizzo,
      cap,
      citta,
      provincia,
      paese: "IT",
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
