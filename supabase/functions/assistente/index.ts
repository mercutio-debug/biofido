// Edge Function "assistente": assistente virtuale di aiuto per ECO-VISA e BioFido.
// Riceve la conversazione dal widget chat e chiama Claude (Haiku: veloce + economico)
// con un system prompt che conosce i portali. Solo AIUTO/GUIDA: nessun accesso ai
// dati, nessun consiglio medico/legale/finanziario. Risposte brevi, in italiano.
//
// SEGRETI: ANTHROPIC_API_KEY
// Deploy: supabase functions deploy assistente --no-verify-jwt   (pubblica: la usano i visitatori non loggati)

import { corsHeaders } from "../_shared/cors.ts";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 500;
const MAX_MSG_LEN = 1500; // lunghezza massima di un singolo messaggio utente
const MAX_TURNS = 12; // quanti messaggi di storia inoltrare (anti-costo/abuso)

type Msg = { role: "user" | "assistant"; content: string };

/** Conoscenza comune dei due portali (semaforo, KM0, impronta, piani, spedizione). */
function systemPrompt(portale: string): string {
  const isBio = portale === "BioFido";
  const nome = isBio ? "BioFido" : "ECO-VISA";
  const cosa = isBio
    ? "BioFido è la mappa delle attività biologiche (produttori, negozi, aziende agricole) vicino all'utente, entro 70 km (chilometro zero). Aiuta a trovarle e raggiungerle."
    : "ECO-VISA misura quanti chilometri hanno percorso le materie prime di un prodotto (la distanza e la CO₂ del trasporto dal luogo di origine allo stabilimento) e lo mostra con un semaforo della filiera.";

  return `Sei l'assistente virtuale di ${nome}. Aiuti i visitatori a capire e usare il sito. Rispondi SEMPRE in italiano, con tono cordiale e conciso (2-5 frasi), e proponi il passo successivo utile (es. "vuoi che ti spieghi come iscriverti?").

COS'È ${nome.toUpperCase()}
${cosa}
ECO-VISA e BioFido sono portali gemelli che condividono le stesse aziende e prodotti.

IL SEMAFORO DELLA FILIERA (concetto chiave)
- Misura SOLO i chilometri che le materie prime hanno percorso per arrivare allo stabilimento (l'"impronta del trasporto"): distanza e CO₂ del trasporto. NON è un giudizio ecologico complessivo del prodotto.
- Verde = filiera corta; il verde più pieno è "KM0" = tutte le materie prime entro 70 km dallo stabilimento. Giallo/rosso = materie prime via via più lontane.
- I dati (materie prime e loro origine) sono dichiarati dalle AZIENDE: i portali sono una vetrina, la verifica è a carico delle aziende iscritte.

COME FUNZIONA PER LE AZIENDE
- Un'azienda si iscrive, compila la scheda (dati, posizione), carica i prodotti con le materie prime e la loro origine → ottiene il semaforo. Può caricare anche esperienze prenotabili (visite, laboratori, degustazioni).
- Piani: Free, Silver, Gold (via via più funzioni: foto, prezzo, vendita online/shop, ecc.). Per i prezzi aggiornati rimanda alla pagina "Abbonamenti".
- Chi vende online imposta la spedizione: una tariffa base (prima scatola) + eventuali scatole aggiuntive in base ai pezzi ("a colli"), o "gratis sopra" una certa spesa. La paga il cliente, la incassa l'azienda.

COME FUNZIONA PER I CLIENTI/VISITATORI
- Possono cercare prodotti e aziende, vedere il semaforo della filiera e i km percorsi, contattare l'azienda, prenotare esperienze e (dalle aziende Gold) acquistare online.

REGOLE
- Parla solo di ${nome} e di come si usa. Se ti chiedono altro (notizie, matematica, argomenti fuori tema), riporta gentilmente al sito.
- NON inventare dati, prezzi precisi, nomi di aziende o numeri: se non li sai, dillo e rimanda alla pagina giusta del sito.
- NON dare consigli medici, legali, fiscali o finanziari.
- Usa il linguaggio del progetto: "km percorsi", "filiera corta", "impronta del trasporto", "KM0". Evita affermazioni generiche tipo "sostenibile/ecologico/green" (per conformità alle norme UE sui claim ambientali).
- Se l'utente sembra un'azienda che vuole iscriversi, guidalo verso "Iscrivi la tua attività"; se è un cliente, verso la ricerca/mappa.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metodo non consentito" }, 405);

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "Assistente non configurato." }, 500);

  try {
    const body = await req.json().catch(() => ({}));
    const portale = String(body?.portale ?? "").includes("Bio") ? "BioFido" : "ECO-VISA";
    const raw = Array.isArray(body?.messages) ? body.messages : [];

    // pulizia + limiti: solo user/assistant, testo non vuoto, tagliato in lunghezza,
    // ultimi MAX_TURNS messaggi. L'ultimo deve essere dell'utente.
    const messages: Msg[] = raw
      .filter(
        (m: unknown): m is Msg =>
          !!m &&
          typeof m === "object" &&
          (((m as Msg).role === "user") || ((m as Msg).role === "assistant")) &&
          typeof (m as Msg).content === "string" &&
          (m as Msg).content.trim().length > 0,
      )
      .slice(-MAX_TURNS)
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MSG_LEN) }));

    // Claude richiede che la conversazione INIZI con un messaggio "user": tolgo
    // l'eventuale saluto iniziale dell'assistente (o altri assistant in testa).
    while (messages.length && messages[0].role === "assistant") messages.shift();

    if (!messages.length || messages[messages.length - 1].role !== "user") {
      return json({ error: "Nessun messaggio valido." }, 400);
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt(portale),
        messages,
      }),
    });

    if (!res.ok) {
      const errTxt = await res.text().catch(() => "");
      console.error("Anthropic error", res.status, errTxt);
      return json({ error: "L'assistente non è raggiungibile in questo momento." }, 502);
    }

    const data = await res.json();
    const reply =
      Array.isArray(data?.content) && data.content.find((c: { type?: string }) => c.type === "text")
        ? (data.content.find((c: { type?: string; text?: string }) => c.type === "text")?.text ?? "")
        : "";

    return json({ reply: reply.trim() || "Scusa, non ho capito. Puoi riformulare?" });
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
