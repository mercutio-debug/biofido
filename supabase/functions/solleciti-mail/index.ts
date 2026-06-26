// Funzione SCHEDULATA (cron settimanale) per i solleciti via email. Due tipi:
//   • invito_semaforo  → ai Free SENZA alcun prodotto/semaforo: "pubblica il primo"
//   • completa_acquisto → a chi ha un acquisto in sospeso da >24h non pagato
// Throttle per non spammare: invito max 3, completa max 2, non più di 1 ogni ~6 giorni.
//
// Segreti usati: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (iniettati da Supabase),
//   RESEND_API_KEY, NOTIFY_FROM. Opzionale CRON_SECRET (se impostato, va passato
//   nell'header "x-cron-secret" da pg_cron, per evitare trigger esterni).
//
// Tabelle richieste (SQL fornito a parte): public.acquisti_sospesi, public.solleciti_email.
// Va deployata con --no-verify-jwt (la chiama il cron, senza token utente).

import { createClient } from "npm:@supabase/supabase-js@2";
import { emailLayout, esc } from "../_shared/email.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const NOTIFY_FROM = Deno.env.get("NOTIFY_FROM") ?? "ECO-VISA <noreply@ecovisa.it>";
const CRON_SECRET = Deno.env.get("CRON_SECRET");
const SITE = "https://ecovisa.it";
const IMG = `${SITE}/brand/uomo-semaforo.png`;

const MIN_GIORNI = 6; // non risollecitare la stessa persona prima di ~6 giorni
const MAX_INVITO = 3;
const MAX_COMPLETA = 2;

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY || !to) return false;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: NOTIFY_FROM, to, subject, html }),
  });
  if (!r.ok) console.error(`solleciti-mail: Resend ${r.status}: ${await r.text()}`);
  return r.ok;
}

async function emailOf(userId: string): Promise<string | null> {
  try {
    const { data } = await admin.auth.admin.getUserById(userId);
    return data?.user?.email ?? null;
  } catch {
    return null;
  }
}

/** true se possiamo inviare a questo utente per questo tipo (entro i max e non troppo presto). */
async function puoInviare(userId: string, tipo: string, max: number): Promise<boolean> {
  const { data } = await admin
    .from("solleciti_email")
    .select("conteggio, ultimo")
    .eq("user_id", userId)
    .eq("tipo", tipo)
    .maybeSingle();
  if (!data) return true;
  if ((data.conteggio ?? 0) >= max) return false;
  if (data.ultimo) {
    const giorni = (Date.now() - new Date(data.ultimo as string).getTime()) / 86_400_000;
    if (giorni < MIN_GIORNI) return false;
  }
  return true;
}

async function segnaInviato(userId: string, tipo: string): Promise<void> {
  const { data } = await admin
    .from("solleciti_email")
    .select("conteggio")
    .eq("user_id", userId)
    .eq("tipo", tipo)
    .maybeSingle();
  await admin.from("solleciti_email").upsert({
    user_id: userId,
    tipo,
    conteggio: (data?.conteggio ?? 0) + 1,
    ultimo: new Date().toISOString(),
  });
}

const imgTag = `<img src="${IMG}" alt="" style="display:block;width:100%;max-width:340px;margin:0 auto 16px;border-radius:14px" />`;

/** #4 — invito a pubblicare il primo semaforo (Free senza prodotti). */
async function invitoSemaforo(): Promise<number> {
  let inviati = 0;
  const { data: aziende } = await admin.from("aziende").select("id, owner, nome");
  if (!aziende?.length) return 0;
  const { data: prod } = await admin.from("prodotti").select("azienda_id");
  const conProdotti = new Set((prod ?? []).map((p) => p.azienda_id));
  const { data: subs } = await admin.from("subscriptions").select("user_id, plan");
  const paganti = new Set(
    (subs ?? []).filter((s) => s.plan === "silver" || s.plan === "gold").map((s) => s.user_id),
  );

  for (const a of aziende) {
    if (!a.owner) continue;
    if (conProdotti.has(a.id)) continue; // ha già almeno un semaforo
    if (paganti.has(a.owner)) continue; // non è Free
    if (!(await puoInviare(a.owner, "invito_semaforo", MAX_INVITO))) continue;
    const email = await emailOf(a.owner);
    if (!email) continue;
    const html = emailLayout({
      title: "Ricordati di completare la tua iscrizione 🌿",
      bodyHtml:
        imgTag +
        `<p>Ciao${a.nome ? " " + esc(a.nome) : ""}! Ti sei iscritto ma non hai ancora completato la tua scheda: manca il tuo primo prodotto con il <b>semaforo di sostenibilità</b>.</p>` +
        `<p><b>Il mondo ti aspetta!</b> Bastano pochi minuti per pubblicare la tua attività e farti trovare — poi fai vedere quanto tu e i tuoi prodotti siete speciali.</p>`,
      ctaLabel: "Completa la mia iscrizione",
      ctaUrl: `${SITE}/dashboard/`,
      footerNote: "Se hai già completato la tua scheda, ignora pure questa email.",
    });
    if (await sendEmail(email, "Completa la tua iscrizione — il mondo ti aspetta! 🌿", html)) {
      await segnaInviato(a.owner, "invito_semaforo");
      inviati++;
    }
  }
  return inviati;
}

/** #3 — sollecito a completare un acquisto avviato e non concluso. */
async function completaAcquisto(): Promise<number> {
  let inviati = 0;
  const { data: subs } = await admin.from("subscriptions").select("user_id, plan");
  const paganti = new Set(
    (subs ?? []).filter((s) => s.plan === "silver" || s.plan === "gold").map((s) => s.user_id),
  );
  const soglia = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const { data: sospesi } = await admin
    .from("acquisti_sospesi")
    .select("user_id, plan, solleciti, creato")
    .lt("creato", soglia);

  for (const s of sospesi ?? []) {
    // se nel frattempo ha pagato, l'acquisto è concluso: rimuovo il record
    if (paganti.has(s.user_id)) {
      await admin.from("acquisti_sospesi").delete().eq("user_id", s.user_id);
      continue;
    }
    if ((s.solleciti ?? 0) >= MAX_COMPLETA) continue;
    if (!(await puoInviare(s.user_id, "completa_acquisto", MAX_COMPLETA))) continue;
    const email = await emailOf(s.user_id);
    if (!email) continue;
    const html = emailLayout({
      title: "Completa il tuo acquisto",
      bodyHtml:
        imgTag +
        `<p>Avevi iniziato l'attivazione del piano <b>${esc(s.plan)}</b> ma non l'hai completata.</p>` +
        `<p>È tutto pronto: riprendi quando vuoi, in pochi click. Il tuo profilo ti aspetta per farsi vedere al meglio.</p>`,
      ctaLabel: "Completa l'acquisto",
      ctaUrl: `${SITE}/dashboard/`,
      footerNote: "Se hai già completato il pagamento, ignora pure questa email.",
    });
    if (await sendEmail(email, "Completa il tuo abbonamento", html)) {
      await admin
        .from("acquisti_sospesi")
        .update({ solleciti: (s.solleciti ?? 0) + 1, ultimo_sollecito: new Date().toISOString() })
        .eq("user_id", s.user_id);
      await segnaInviato(s.user_id, "completa_acquisto");
      inviati++;
    }
  }
  return inviati;
}

Deno.serve(async (req) => {
  // Sicurezza opzionale: se CRON_SECRET è impostato, va passato nell'header.
  if (CRON_SECRET && req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response("forbidden", { status: 403 });
  }
  try {
    const invito = await invitoSemaforo();
    const completa = await completaAcquisto();
    return new Response(JSON.stringify({ invito_semaforo: invito, completa_acquisto: completa }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("solleciti-mail: errore", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
