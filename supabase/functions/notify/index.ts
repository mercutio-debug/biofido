// Edge Function "notify": invia notifiche email (Resend) e Web Push quando
// arriva un nuovo messaggio o una nuova prenotazione.
//
// Va collegata come Database Webhook di Supabase (INSERT) sulle tabelle
// `messaggi` e `prenotazioni`. Riceve il payload standard del webhook e ricava
// il destinatario corretto (l'altra parte della prenotazione).
//
// SEGRETI (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY     re_...        (per le email; se assente, salta l'email)
//   NOTIFY_FROM        "BioFido <noreply@tuodominio.it>"
//   VAPID_PUBLIC_KEY   B...          (per il push; se assente, salta il push)
//   VAPID_PRIVATE_KEY  ...
//   VAPID_SUBJECT      "mailto:tu@dominio.it"
//   SITE_URL           "https://.../biofido"   (link nelle notifiche)
// (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sono iniettati da Supabase.)
//
// Deploy: supabase functions deploy notify --no-verify-jwt

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { emailLayout, esc, nl2br } from "../_shared/email.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const NOTIFY_FROM = Deno.env.get("NOTIFY_FROM") ?? "BioFido <onboarding@resend.dev>";
const SITE_URL = Deno.env.get("SITE_URL") ?? "";
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:noreply@biofido.it";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

type Notice = {
  userId?: string | null; // destinatario per il push (se registrato)
  email?: string | null; // destinatario email
  title: string;
  body: string;
  url: string;
  ctaLabel?: string; // testo del pulsante nell'email (default: "Apri la dashboard")
  replyTo?: string | null; // "rispondi a" dell'email (es. email del cliente)
};

async function sendEmail(to: string, subject: string, html: string, replyTo?: string) {
  if (!RESEND_API_KEY) {
    console.error("notify: RESEND_API_KEY mancante a runtime — email saltata");
    return;
  }
  console.log(`notify: invio email a ${to} (from ${NOTIFY_FROM})`);
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: NOTIFY_FROM,
      to,
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });
  // logghiamo SEMPRE l'esito (anche il successo), così nei Logs si vede tutto
  if (!r.ok) {
    console.error(`notify: Resend ha risposto ${r.status}: ${await r.text()}`);
  } else {
    console.log(`notify: Resend OK ${r.status} per ${to}`);
  }
}

async function sendPush(userId: string, payload: Notice) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url,
    icon: SITE_URL ? `${SITE_URL}/brand/icon-192.png` : undefined,
  });
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        body,
      );
    } catch (e) {
      // iscrizione scaduta/non valida: la rimuovo
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
    }
  }
}

async function emailOf(userId: string): Promise<string | null> {
  // robusto: un id assente o non-UUID non deve far fallire l'intera notifica
  try {
    if (!userId) return null;
    const { data } = await admin.auth.admin.getUserById(userId);
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}

async function dispatch(n: Notice) {
  const html = emailLayout({
    title: n.title,
    bodyHtml: `<p style="margin:0;">${nl2br(esc(n.body))}</p>`,
    ctaLabel: n.ctaLabel ?? "Apri la dashboard",
    ctaUrl: n.url,
  });
  if (!n.email) console.log(`notify: nessun destinatario email per "${n.title}" (email mancante)`);
  if (n.email) await sendEmail(n.email, n.title, html, n.replyTo ?? undefined);
  if (n.userId) await sendPush(n.userId, n);
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const table: string = payload.table;
    const rec = payload.record ?? {};
    console.log(`notify: evento su tabella "${table}"`);

    if (table === "users") {
      // nuova iscrizione (auth.users): avviso l'amministratore via email.
      // Distinguo CLIENTE vs AZIENDA dal metadato salvato alla registrazione.
      const tipo =
        rec.raw_user_meta_data?.tipo ?? rec.user_metadata?.tipo ?? "azienda";
      const chi = tipo === "cliente" ? "un nuovo cliente" : "una nuova azienda";
      await dispatch({
        email: "mauriziocapitelli@yahoo.it",
        title:
          tipo === "cliente"
            ? "Nuovo cliente su BioFido / ECO-VISA"
            : "Nuova azienda su BioFido / ECO-VISA",
        body: `Si è iscritto ${chi}: ${rec.email ?? "(email non disponibile)"}.`,
        url: `${SITE_URL}/admin/`,
        ctaLabel: "Apri l'area admin",
      });
      return ok();
    }

    if (table === "messaggi") {
      const { data: p } = await admin
        .from("prenotazioni")
        .select("owner, cliente_user_id, cliente_email, esperienze(titolo)")
        .eq("id", rec.prenotazione_id)
        .maybeSingle();
      if (!p) return ok();

      const titolo =
        (p as { esperienze?: { titolo?: string } }).esperienze?.titolo ??
        "la tua prenotazione";
      const url = `${SITE_URL}/prenotazioni/`;

      if (rec.mittente === "azienda") {
        // il produttore ha scritto al cliente
        await dispatch({
          userId: p.cliente_user_id,
          email: p.cliente_email,
          title: `Nuovo messaggio · ${titolo}`,
          body: rec.testo,
          url,
          ctaLabel: "Vedi la conversazione",
        });
      } else {
        // il cliente ha scritto al produttore
        await dispatch({
          userId: p.owner,
          email: await emailOf(p.owner),
          title: `Nuovo messaggio dal cliente · ${titolo}`,
          body: rec.testo,
          url: `${SITE_URL}/dashboard/`,
        });
      }
      return ok();
    }

    if (table === "prenotazioni") {
      const titolo = rec.titolo ?? "un'esperienza";
      // 1) avviso il produttore della nuova richiesta
      await dispatch({
        userId: rec.owner,
        email: await emailOf(rec.owner),
        title: "Nuova richiesta di prenotazione",
        body: `${rec.cliente_nome} ha richiesto «${titolo}» per ${rec.persone} persone.`,
        url: `${SITE_URL}/dashboard/`,
        replyTo: rec.cliente_email ?? undefined,
      });
      // 2) confermo al CLIENTE che la richiesta è partita
      if (rec.cliente_email) {
        await dispatch({
          email: rec.cliente_email,
          title: "Richiesta di prenotazione inviata ✅",
          body:
            `Ciao ${rec.cliente_nome}, abbiamo inviato la tua richiesta per «${titolo}» ` +
            `(${rec.persone} persone). L'azienda ti contatterà a breve per confermare. ` +
            `Riceverai un secondo messaggio con l'esito.`,
          url: `${SITE_URL}/`,
          ctaLabel: "Vai al portale",
        });
      }
      return ok();
    }

    if (table === "contatti") {
      // "Contatta l'azienda": recapito il messaggio del cliente all'azienda,
      // con reply-to all'email del cliente così può rispondere direttamente.
      await dispatch({
        userId: rec.azienda,
        email: await emailOf(rec.azienda),
        title: `Nuovo messaggio da ${rec.nome_cliente ?? "un cliente"}`,
        body:
          `${rec.nome_cliente ?? "Un cliente"} (${rec.email_cliente ?? "email n.d."}) ti ha scritto:\n\n` +
          `${rec.messaggio ?? ""}`,
        url: `${SITE_URL}/dashboard/#messaggi`,
        replyTo: rec.email_cliente ?? undefined,
      });
      return ok();
    }

    if (table === "onboarding_files") {
      // L'azienda ha caricato un file per «Ci pensiamo noi»: avviso l'admin
      // (email + push). L'SMS arriverà quando colleghiamo il fornitore SMS.
      const emailAzienda = rec.owner ? (await emailOf(rec.owner)) ?? "(azienda)" : "(azienda)";
      await dispatch({
        userId: rec.owner, // push: best-effort
        email: "mauriziocapitelli@yahoo.it",
        title: "📎 Nuovo materiale onboarding caricato",
        body: `L'azienda ${emailAzienda} ha caricato per «Ci pensiamo noi»: ${rec.nome ?? "(file)"}.`,
        // link diretto alla scheda dell'azienda nell'area admin (con i documenti)
        url: `${SITE_URL}/admin/#onb-${rec.owner}`,
        ctaLabel: "Vedi i documenti caricati",
      });
      return ok();
    }

    if (table === "onboarding_stato") {
      // Quando il negozio è PRONTO, avviso l'azienda di approvarlo (mail + push).
      if (rec.stato === "pronto") {
        await dispatch({
          userId: rec.owner,
          email: await emailOf(rec.owner),
          title: "🛍️ Il tuo negozio è pronto!",
          body:
            `Abbiamo preparato il tuo negozio online «Ci pensiamo noi». ` +
            `Aprilo dalla dashboard, controlla prodotti, prezzi, foto e giacenze, ` +
            `poi premi «Approva e pubblica» (con la spunta di manleva) per renderlo ` +
            `visibile al pubblico e iniziare a vendere.`,
          url: `${SITE_URL}/dashboard/`,
          ctaLabel: "Apri e approva il negozio",
        });
        return ok();
      }
      // Quando il team chiede INTEGRAZIONI, avviso l'azienda (mail + push).
      if (rec.stato === "integrazioni") {
        await dispatch({
          userId: rec.owner,
          email: await emailOf(rec.owner),
          title: "📌 Servono integrazioni per il tuo negozio",
          body:
            `Per completare il tuo negozio «Ci pensiamo noi» ci serve altro materiale:\n\n` +
            `${rec.nota ?? "(dettagli nella tua dashboard)"}\n\n` +
            `Carica i file mancanti nella cornice «Ci pensiamo noi» della tua dashboard, ` +
            `poi premi di nuovo «Ho caricato tutto».`,
          url: `${SITE_URL}/dashboard/`,
          ctaLabel: "Carica il materiale",
        });
      }
      return ok();
    }

    return ok();
  } catch (e) {
    console.error(e);
    return new Response((e as Error).message, { status: 500 });
  }
});

function ok() {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
