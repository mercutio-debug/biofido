// Edge Function "analizza-onboarding" — DORMIENTE (scritta ora, da ATTIVARE in
// futuro quando i volumi giustificano il costo).
//
// Cosa fa, una volta attivata: prende i file caricati dall'azienda per
// «Ci pensiamo noi» (tabella onboarding_files), li manda all'API di Claude che
// legge PDF e immagini nativamente, ed ESTRAE una bozza di prodotti per lo shop
// (nome, descrizione, prezzo, categoria, unità). Le bozze finiscono in
// `onboarding_estrazioni` (stato 'bozza') e vanno SEMPRE riviste da un umano
// prima di diventare prodotti reali (l'IA può sbagliare).
//
// PER ATTIVARLA (in futuro):
//   1) crea la tabella onboarding_estrazioni (owner uuid, prodotti jsonb,
//      source text, stato text default 'bozza', created_at timestamptz default now());
//   2) imposta il secret ANTHROPIC_API_KEY;
//   3) `supabase functions deploy analizza-onboarding`;
//   4) chiamala (manualmente o da un trigger su onboarding_files) con { owner }.
// Finché ANTHROPIC_API_KEY è assente, la funzione NON fa nulla (nessun costo).

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-haiku-4-5-20251001";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type Prodotto = {
  nome: string;
  descrizione?: string;
  prezzo?: string;
  categoria?: string;
  unita?: string;
};

/** Scarica un file e lo converte in base64 (per i content-block di Claude). */
async function fileToBase64(url: string): Promise<{ base64: string; mime: string } | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const mime = r.headers.get("content-type") ?? "application/octet-stream";
    const buf = new Uint8Array(await r.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return { base64: btoa(bin), mime };
  } catch {
    return null;
  }
}

/** Chiede a Claude di estrarre i prodotti da un documento/immagine. */
async function estraiDaFile(url: string): Promise<Prodotto[]> {
  const f = await fileToBase64(url);
  if (!f) return [];
  // PDF → blocco "document"; immagini → blocco "image"; altri formati: saltati
  let contentBlock: Record<string, unknown> | null = null;
  if (f.mime.includes("pdf")) {
    contentBlock = { type: "document", source: { type: "base64", media_type: "application/pdf", data: f.base64 } };
  } else if (f.mime.startsWith("image/")) {
    contentBlock = { type: "image", source: { type: "base64", media_type: f.mime, data: f.base64 } };
  } else {
    return []; // xls/doc: convertire prima in PDF/testo (passo successivo)
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            contentBlock,
            {
              type: "text",
              text:
                "Estrai l'elenco dei PRODOTTI da questo documento di un'azienda agroalimentare. " +
                "Per ciascun prodotto restituisci: nome, descrizione (se presente), prezzo (se presente), " +
                "categoria, unità (es. al kg, a pezzo). Rispondi SOLO con un array JSON di oggetti " +
                '{nome, descrizione, prezzo, categoria, unita}. Nessun testo fuori dal JSON.',
            },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    console.error("analizza-onboarding: Anthropic", res.status, await res.text());
    return [];
  }
  const body = await res.json();
  const txt = (body?.content?.[0]?.text as string) ?? "[]";
  try {
    const json = JSON.parse(txt.replace(/^```json\s*|\s*```$/g, ""));
    return Array.isArray(json) ? (json as Prodotto[]) : [];
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  // Interruttore di sicurezza: senza chiave, funzione dormiente (nessun costo).
  if (!ANTHROPIC_API_KEY) {
    return json({ skipped: true, reason: "ANTHROPIC_API_KEY assente: analisi IA non attiva." });
  }
  try {
    const { owner } = await req.json();
    if (!owner) return json({ error: "owner mancante" }, 400);

    const { data: files } = await admin
      .from("onboarding_files")
      .select("url, nome")
      .eq("owner", owner);

    const prodotti: Prodotto[] = [];
    for (const f of files ?? []) {
      const estratti = await estraiDaFile((f as { url: string }).url);
      prodotti.push(...estratti);
    }

    await admin.from("onboarding_estrazioni").insert({
      owner,
      prodotti,
      source: "ia",
      stato: "bozza",
    });

    return json({ ok: true, estratti: prodotti.length });
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
