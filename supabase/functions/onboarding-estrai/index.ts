// Edge Function "onboarding-estrai": motore AI del servizio «Ci pensiamo noi».
// L'azienda carica foto (etichette/listini/insegna) + due righe di testo; qui
// Claude Sonnet (vision) ESTRAE i prodotti — SENZA inventare nulla:
//   - descrizione SOLO se fornita dall'azienda; se assente → solo il nome.
//   - materie prime + origine SOLO se dichiarate (il semaforo non è obbligatorio).
// Per i prodotti senza foto, cerca un'immagine OPEN SOURCE (Openverse, licenze CC)
// e la SEGNALA come reperita automaticamente. Restituisce prodotti + una RICEVUTA
// trasparente di cosa l'azienda ha caricato e cosa ha fatto l'IA.
//
// Gira solo su richiesta di un'azienda LOGGATA che ha pagato l'onboarding → non
// pubblico, nessun rischio di abuso.
//
// SEGRETI: ANTHROPIC_API_KEY
// Deploy: supabase functions deploy onboarding-estrai

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const MODEL = "claude-sonnet-5";
const MAX_IMG = 8; // massimo foto analizzate
const MAX_TEXT = 4000;

type MateriaPrima = { nome: string; origine: string };
type Prodotto = {
  nome: string;
  categoria: string;
  descrizione: string;
  descrizione_fornita: boolean;
  foto_fornita: boolean;
  materie_prime: MateriaPrima[];
  // popolati DOPO da noi:
  foto_url?: string | null;
  foto_auto?: boolean;
};

const TOOL = {
  name: "salva_prodotti",
  description: "Registra i prodotti estratti dal materiale caricato dall'azienda.",
  input_schema: {
    type: "object",
    properties: {
      prodotti: {
        type: "array",
        items: {
          type: "object",
          properties: {
            nome: { type: "string", description: "Nome del prodotto come indicato dall'azienda." },
            categoria: {
              type: "string",
              description: "Categoria breve (es. 'olio essenziale', 'marmellata', 'biscotti'). Deducibile dal nome.",
            },
            descrizione: {
              type: "string",
              description:
                "Descrizione SOLO se l'azienda l'ha fornita (nel testo o leggibile in etichetta). Se NON è fornita, lascia stringa VUOTA. NON inventare, NON dedurre, NON ampliare: non conosciamo il prodotto.",
            },
            descrizione_fornita: {
              type: "boolean",
              description: "true SOLO se una descrizione reale è stata fornita dall'azienda.",
            },
            foto_fornita: {
              type: "boolean",
              description: "true se tra le immagini caricate c'è una foto di QUESTO prodotto.",
            },
            materie_prime: {
              type: "array",
              description:
                "Materie prime con la loro origine, SOLO se dichiarate dall'azienda. Se non dichiarate, array vuoto. NON inventare origini.",
              items: {
                type: "object",
                properties: {
                  nome: { type: "string" },
                  origine: { type: "string" },
                },
                required: ["nome", "origine"],
              },
            },
          },
          required: ["nome", "categoria", "descrizione", "descrizione_fornita", "foto_fornita", "materie_prime"],
        },
      },
    },
    required: ["prodotti"],
  },
};

function promptTesto(testo: string, nImg: number): string {
  return `Sei l'assistente di onboarding di un portale di prodotti a filiera corta. L'azienda ha caricato ${nImg} immagini (foto di etichette, listini, prodotti o insegna) e questo testo:

"""
${testo || "(nessun testo fornito)"}
"""

Estrai l'ELENCO DEI PRODOTTI e chiama lo strumento salva_prodotti.

REGOLE FERREE (contano più di tutto):
- NON INVENTARE. Riporta solo ciò che l'azienda ha davvero scritto o mostrato.
- DESCRIZIONE: compilala SOLO se l'azienda l'ha fornita (nel testo o chiaramente scritta in etichetta). Se non c'è, lascia descrizione VUOTA e descrizione_fornita=false. Non "arricchire", non dedurre pregi, non scrivere frasi di marketing su un prodotto che non conosciamo.
- MATERIE PRIME + ORIGINE: solo se dichiarate. Altrimenti array vuoto. Non inventare provenienze.
- foto_fornita: true se una delle immagini è la foto di quel prodotto.
- Se un listino elenca più prodotti, crea una voce per ciascuno.
- Rispondi sempre in italiano.`;
}

/** Cerca un'immagine open source (Openverse, licenze CC) per un tipo di prodotto. */
async function immagineOpenSource(query: string): Promise<string | null> {
  try {
    const url =
      "https://api.openverse.org/v1/images/?page_size=1&license_type=commercial&q=" +
      encodeURIComponent(query);
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    const hit = Array.isArray(data?.results) ? data.results[0] : null;
    return (hit?.url as string) || (hit?.thumbnail as string) || null;
  } catch {
    return null;
  }
}

/** Scarica un'immagine e la codifica in base64 (per la "vista" di Claude). */
async function scaricaImg(
  u: string,
): Promise<{ media_type: string; data: string } | null> {
  try {
    const res = await fetch(u);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "image/jpeg";
    if (!/^image\//i.test(ct)) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength > 5 * 1024 * 1024) return null; // >5MB: salto (troppo grande)
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return { media_type: ct.split(";")[0], data: btoa(bin) };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metodo non consentito" }, 405);

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "Servizio non configurato." }, 500);

  try {
    // GATE: solo azienda LOGGATA che ha PAGATO l'onboarding (anti-abuso/costi).
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return json({ error: "Accedi per usare l'analisi." }, 401);
    const { data: sub } = await admin
      .from("subscriptions")
      .select("extras")
      .eq("user_id", user.id)
      .maybeSingle();
    const extras = ((sub?.extras as string | null) ?? "").split(",").map((s) => s.trim());
    if (!extras.includes("onboarding")) {
      return json({ error: "Questa funzione è inclusa nel servizio «Ci pensiamo noi»." }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const testo = String(body?.testo ?? "").slice(0, MAX_TEXT);
    const urls: string[] = Array.isArray(body?.immagini)
      ? body.immagini.filter((u: unknown) => typeof u === "string").slice(0, MAX_IMG)
      : [];

    if (!testo.trim() && urls.length === 0) {
      return json({ error: "Carica almeno una foto o scrivi due righe sui tuoi prodotti." }, 400);
    }

    // scarico le immagini per la "vista" di Claude
    const imgs = (await Promise.all(urls.map(scaricaImg))).filter(Boolean) as {
      media_type: string;
      data: string;
    }[];

    const content: unknown[] = [{ type: "text", text: promptTesto(testo, imgs.length) }];
    for (const im of imgs) {
      content.push({ type: "image", source: { type: "base64", media_type: im.media_type, data: im.data } });
    }

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2500,
        tools: [TOOL],
        tool_choice: { type: "tool", name: "salva_prodotti" },
        messages: [{ role: "user", content }],
      }),
    });

    if (!aiRes.ok) {
      console.error("Anthropic", aiRes.status, await aiRes.text().catch(() => ""));
      return json({ error: "Analisi non riuscita, riprova tra poco." }, 502);
    }

    const data = await aiRes.json();
    const toolUse = Array.isArray(data?.content)
      ? data.content.find((c: { type?: string }) => c.type === "tool_use")
      : null;
    const prodotti: Prodotto[] = (toolUse?.input?.prodotti ?? []).map((p: Prodotto) => ({
      nome: String(p.nome ?? "").trim(),
      categoria: String(p.categoria ?? "").trim(),
      // sicurezza extra: se non è fornita, la descrizione resta il solo nome (mai inventata)
      descrizione: p.descrizione_fornita ? String(p.descrizione ?? "").trim() : "",
      descrizione_fornita: !!p.descrizione_fornita,
      foto_fornita: !!p.foto_fornita,
      materie_prime: Array.isArray(p.materie_prime) ? p.materie_prime : [],
      foto_url: null,
      foto_auto: false,
    }));

    // per i prodotti SENZA foto propria → cerco un'immagine open source e la segnalo
    for (const p of prodotti) {
      if (!p.foto_fornita && p.nome) {
        const img = await immagineOpenSource(p.categoria || p.nome);
        if (img) {
          p.foto_url = img;
          p.foto_auto = true;
        }
      }
    }

    // RICEVUTA: cosa ha caricato l'azienda e cosa ha fatto l'IA, prodotto per prodotto
    const ricevuta = prodotti.map((p, i) => {
      const desc = p.descrizione_fornita
        ? "con descrizione (fornita da te)"
        : "senza descrizione (useremo solo il nome — la descrizione la aggiungi tu)";
      const foto = p.foto_fornita
        ? "con la tua foto"
        : p.foto_auto
          ? "foto assente → reperita dall'IA tra immagini open source"
          : "senza foto";
      return `${i + 1}. ${p.nome || "(senza nome)"} — ${desc}, ${foto}`;
    });

    return json({ prodotti, ricevuta });
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
