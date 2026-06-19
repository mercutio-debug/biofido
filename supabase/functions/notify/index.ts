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
};

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.error("notify: RESEND_API_KEY mancante a runtime — email saltata");
    return;
  }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: NOTIFY_FROM, to, subject, html }),
  });
  // niente errori "muti": se Resend rifiuta, lo logghiamo nei Logs della funzione
  if (!r.ok) {
    console.error(`notify: Resend ha risposto ${r.status}: ${await r.text()}`);
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
  const { data } = await admin.auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}

async function dispatch(n: Notice) {
  const link = n.url;
  const html = `<p>${n.body}</p><p><a href="${link}">Apri BioFido</a></p>`;
  if (n.email) await sendEmail(n.email, n.title, html);
  if (n.userId) await sendPush(n.userId, n);
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const table: string = payload.table;
    const rec = payload.record ?? {};

    if (table === "users") {
      // nuova iscrizione (auth.users): avviso l'amministratore via email
      await dispatch({
        email: "mauriziocapitelli@yahoo.it",
        title: "Nuova iscrizione su BioFido / ECO-VISA",
        body: `Si è iscritta una nuova azienda: ${rec.email ?? "(email non disponibile)"}.`,
        url: `${SITE_URL}/admin/`,
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
      // nuova richiesta: avviso il produttore
      await dispatch({
        userId: rec.owner,
        email: await emailOf(rec.owner),
        title: "Nuova richiesta di prenotazione",
        body: `${rec.cliente_nome} ha richiesto una prenotazione per ${rec.persone} persone.`,
        url: `${SITE_URL}/dashboard/`,
      });
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
