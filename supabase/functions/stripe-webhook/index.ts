// Edge Function: webhook Stripe. Gestisce:
//  - abbonamenti (subscriptions) → aggiorna il piano dell'utente
//  - pagamenti delle prenotazioni (Connect) → marca la prenotazione "pagata"
//  - account.updated (Connect) → aggiorna lo stato dell'account del produttore
//
// Scrive con la SERVICE-ROLE key (bypassa la RLS): è l'unico punto autorizzato
// a cambiare piano/stato pagamento, così nessuno può falsificarli dal client.
//
// SEGRETI richiesti:
//   STRIPE_SECRET_KEY        sk_...
//   STRIPE_WEBHOOK_SECRET    whsec_...  (lo dà Stripe quando registri il webhook)
//
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt

import Stripe from "npm:stripe@16.12.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { emailLayout, esc } from "../_shared/email.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Notifica email all'amministratore con il riepilogo del pagamento e i dati di
// fatturazione, così può emettere la fattura a mano finché non colleghiamo Aruba.
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const NOTIFY_FROM = Deno.env.get("NOTIFY_FROM") ?? "ECO-VISA & BioFido <noreply@ecovisa.it>";
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") ?? "mauriziocapitelli@yahoo.it";
const SITE_URL = Deno.env.get("SITE_URL") ?? "";

// Notifiche SMS (funzione GOLD) — fornitore: Smshosting (LINK Mobility), REST API.
// SEGRETI su Edge Functions: SMS_API_KEY (=AUTH_KEY), SMS_API_SECRET (=AUTH_SECRET),
// SMS_SENDER (mittente alfanumerico registrato su Smshosting, max 11 caratteri).
// Finché le chiavi non ci sono, l'SMS viene saltato (loggato), senza errori.
const SMS_API_KEY = Deno.env.get("SMS_API_KEY");
const SMS_API_SECRET = Deno.env.get("SMS_API_SECRET");
const SMS_SENDER = Deno.env.get("SMS_SENDER") ?? "EcoVisa";

/** Normalizza un numero italiano in formato internazionale (+39…). */
function normalizzaNumero(n: string): string {
  let s = (n || "").replace(/[\s.\-()]/g, "");
  if (s.startsWith("+")) return s;
  if (s.startsWith("00")) return "+" + s.slice(2);
  if (s.startsWith("39")) return "+" + s;
  if (s.startsWith("3")) return "+39" + s; // cellulare IT senza prefisso
  return s;
}

/** Invio SMS via Smshosting (REST, Basic auth AUTH_KEY:AUTH_SECRET). */
async function sendSms(to: string, body: string): Promise<void> {
  if (!SMS_API_KEY || !SMS_API_SECRET) {
    console.log(`sms: chiavi Smshosting assenti — SMS a ${to} saltato`);
    return;
  }
  try {
    const auth = btoa(`${SMS_API_KEY}:${SMS_API_SECRET}`);
    const params = new URLSearchParams({
      from: SMS_SENDER,
      to: normalizzaNumero(to),
      text: body,
    });
    const r = await fetch("https://api.smshosting.it/rest/api/sms/send", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    if (!r.ok) console.error(`sms: Smshosting ha risposto ${r.status}: ${await r.text()}`);
    else console.log(`sms: inviato a ${normalizzaNumero(to)}`);
  } catch (e) {
    console.error("sms: errore invio:", (e as Error).message);
  }
}

/** Se l'azienda è GOLD e ha attivato l'SMS ordini, le manda l'avviso via SMS. */
async function avvisaAziendaOrdineSms(owner: string, testo: string): Promise<void> {
  // gating Gold lato server (la UI lo nasconde ai non-Gold, ma ricontrolliamo qui)
  const { data: sub } = await admin
    .from("subscriptions")
    .select("plan")
    .eq("user_id", owner)
    .maybeSingle();
  if ((sub?.plan as string) !== "gold") return;

  const { data: pref } = await admin
    .from("sms_preferenze")
    .select("attivo, numero")
    .eq("user_id", owner)
    .maybeSingle();
  if (!pref?.attivo || !pref?.numero) return;

  await sendSms(String(pref.numero), testo);
}

async function avvisaAdminPagamento(
  s: Stripe.Checkout.Session,
  userId: string,
  plan: string,
) {
  if (!RESEND_API_KEY) {
    console.error("stripe-webhook: RESEND_API_KEY mancante — email pagamento saltata");
    return;
  }
  // dati di fatturazione del cliente
  const { data: f } = await admin
    .from("dati_fatturazione")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  const dati = (f ?? {}) as Record<string, string | null>;

  // email dell'account
  const { data: u } = await admin.auth.admin.getUserById(userId);
  const emailCliente = u?.user?.email ?? s.customer_details?.email ?? "—";

  const importo = s.amount_total != null
    ? (s.amount_total / 100).toLocaleString("it-IT", {
        style: "currency",
        currency: (s.currency ?? "eur").toUpperCase(),
      })
    : "—";

  const html = emailLayout({
    title: "💶 Nuovo pagamento abbonamento",
    bodyHtml: `
      <p style="margin:0 0 14px;">
        <strong>Piano:</strong> ${esc(plan.toUpperCase())}<br/>
        <strong>Importo incassato:</strong> ${esc(importo)}<br/>
        <strong>Account cliente:</strong> ${esc(emailCliente)}<br/>
        <strong>Data:</strong> ${esc(new Date().toLocaleString("it-IT"))}
      </p>
      <div style="border-top:1px solid #e3eed7;margin:14px 0;"></div>
      <p style="margin:0 0 6px;font-weight:bold;color:#1c5132;">Dati per la fattura</p>
      <p style="margin:0;">
        <strong>Ragione sociale:</strong> ${esc(dati.ragione_sociale ?? "—")}<br/>
        <strong>Partita IVA:</strong> ${esc(dati.partita_iva ?? "—")}<br/>
        <strong>Codice fiscale:</strong> ${esc(dati.codice_fiscale ?? "—")}<br/>
        <strong>Indirizzo:</strong> ${esc(dati.indirizzo ?? "—")}, ${esc(dati.cap ?? "")} ${esc(dati.citta ?? "")} ${esc(dati.provincia ?? "")} ${esc(dati.paese ?? "")}<br/>
        <strong>Codice SDI:</strong> ${esc(dati.codice_sdi ?? "—")}<br/>
        <strong>PEC:</strong> ${esc(dati.pec ?? "—")}<br/>
        <strong>Email fatturazione:</strong> ${esc(dati.email ?? "—")}
      </p>
      <p style="margin:14px 0 0;color:#9aa89d;font-size:12px;">Stripe session: ${esc(s.id)}${s.subscription ? ` · subscription: ${esc(String(s.subscription))}` : ""}</p>
    `,
    footerNote: "Promemoria interno: emetti la fattura al cliente.",
  });

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: NOTIFY_FROM,
      to: ADMIN_EMAIL,
      subject: `💶 Pagamento ${plan.toUpperCase()} ${importo} — emetti fattura`,
      html,
    }),
  });
  if (!r.ok) {
    console.error(`stripe-webhook: Resend ha risposto ${r.status}: ${await r.text()}`);
  }
}

/** Avvisa l'AZIENDA via email quando arriva (ed è autorizzato) un nuovo ordine. */
async function avvisaAziendaOrdine(ordineId: string) {
  if (!RESEND_API_KEY) {
    console.error("stripe-webhook: RESEND_API_KEY mancante — email ordine saltata");
    return;
  }
  const { data: o } = await admin
    .from("ordini")
    .select("owner, cliente_nome, cliente_email, quantita, totale_cents, modalita, prodotto_id, portale")
    .eq("id", ordineId)
    .maybeSingle();
  if (!o) return;

  const { data: prod } = await admin
    .from("catalogo")
    .select("nome")
    .eq("id", o.prodotto_id)
    .maybeSingle();

  const { data: u } = await admin.auth.admin.getUserById(o.owner);
  const to = u?.user?.email;
  if (!to) return;

  const importo = (Number(o.totale_cents) / 100).toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
  });
  const nomeProd = (prod as { nome?: string } | null)?.nome ?? "Prodotto";

  const html = emailLayout({
    title: "🛒 Nuovo ordine ricevuto",
    bodyHtml: `
      <p style="margin:0 0 14px;">
        <strong>${esc(nomeProd)}</strong> × ${esc(o.quantita)} — <strong>${esc(importo)}</strong><br/>
        Cliente: ${esc(o.cliente_nome)} (${esc(o.cliente_email)})<br/>
        Consegna: ${esc(o.modalita)}${o.portale ? ` · ${esc(o.portale)}` : ""}
      </p>
      <p style="margin:0;">
        Il pagamento è stato <strong>autorizzato</strong> (fondi bloccati). Per
        incassarlo, <strong>accetta l'ordine</strong> dalla pagina “Ordini ricevuti”;
        se rifiuti, i fondi vengono rilasciati senza addebito.
      </p>
    `,
    ctaLabel: SITE_URL ? "Vai agli ordini ricevuti" : undefined,
    ctaUrl: SITE_URL ? `${SITE_URL}/dashboard/` : undefined,
    footerNote: "Accetta entro pochi giorni per non perdere l'autorizzazione del pagamento.",
  });

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: NOTIFY_FROM,
      to,
      subject: `🛒 Nuovo ordine: ${nomeProd} ${importo}`,
      html,
    }),
  });
  if (!r.ok) {
    console.error(`stripe-webhook: Resend ordine ha risposto ${r.status}: ${await r.text()}`);
  }

  // SMS all'azienda (solo Gold + spunta attiva; no-op finché il fornitore SMS
  // non è collegato). Best-effort: non deve mai bloccare l'email/ordine.
  try {
    await avvisaAziendaOrdineSms(
      o.owner,
      `Nuovo ordine su ${SMS_SENDER}: ${nomeProd} x${o.quantita} — ${importo}. Da ${o.cliente_nome}. Gestiscilo in "Ordini ricevuti".`,
    );
  } catch (e) {
    console.error("stripe-webhook: SMS ordine errore:", (e as Error).message);
  }
}

/** Aggiorna l'abbonamento e allinea il piano delle schede dell'utente. */
async function setPlan(
  userId: string,
  plan: "free" | "silver" | "gold",
  fields: Record<string, unknown>,
) {
  await admin
    .from("subscriptions")
    .upsert({ user_id: userId, plan, updated_at: new Date().toISOString(), ...fields });
  await admin.from("biofido_businesses").update({ plan }).eq("owner", userId);
}

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig!, webhookSecret);
  } catch (e) {
    return new Response(`Firma non valida: ${(e as Error).message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        // Autorizzazione di un ORDINE prodotto (manual capture): registra il
        // PaymentIntent. I fondi sono bloccati; l'addebito avviene quando
        // l'azienda accetta (order-capture). L'ordine resta 'richiesto'.
        if (s.metadata?.kind === "order") {
          const ordineId = s.metadata?.ordine_id;
          if (ordineId) {
            await admin
              .from("ordini")
              .update({
                stripe_payment_intent: s.payment_intent as string,
                stripe_session_id: s.id,
              })
              .eq("id", ordineId);
            // avvisa l'azienda del nuovo ordine da accettare
            await avvisaAziendaOrdine(ordineId);
          }
          break;
        }
        // Pagamento di un ORDINE SHOP (dopo conferma azienda/accettazione): pagato.
        if (s.metadata?.kind === "order_shop") {
          const ordineId = s.metadata?.ordine_shop_id;
          if (ordineId) {
            await admin
              .from("ordini_shop")
              .update({ stato: "pagato", updated_at: new Date().toISOString() })
              .eq("id", ordineId);
          }
          break;
        }
        // Pagamento di una prenotazione (Connect)
        if (s.metadata?.kind === "booking") {
          const prenotazioneId = s.metadata?.prenotazione_id;
          if (prenotazioneId) {
            await admin
              .from("prenotazioni")
              .update({ payment_status: "pagata", stripe_session_id: s.id })
              .eq("id", prenotazioneId);
          }
          break;
        }
        // Altrimenti: attivazione abbonamento
        const userId = s.metadata?.user_id ?? s.client_reference_id ?? "";
        const plan = (s.metadata?.plan as "silver" | "gold") ?? "silver";
        if (userId) {
          // 1) ATTIVA il piano (operazione critica: NON deve dipendere da altro)
          await setPlan(userId, plan, {
            status: "active",
            stripe_customer_id: s.customer as string,
            stripe_subscription_id: s.subscription as string,
          });
          // 2) salva gli extra acquistati (es. "onboarding,badge") A PARTE e in
          //    BEST-EFFORT: se la colonna `extras` non esiste, logga e prosegue —
          //    così una colonna mancante non potrà MAI bloccare l'attivazione.
          if (s.metadata?.extras) {
            const { error: exErr } = await admin
              .from("subscriptions")
              .update({ extras: s.metadata.extras })
              .eq("user_id", userId);
            if (exErr) {
              console.error("stripe-webhook: extras non salvati (colonna assente?):", exErr.message);
            }
          }
          // avvisa l'admin con il riepilogo per la fattura (Aruba non ancora collegato)
          await avvisaAdminPagamento(s, userId, plan);
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id ?? "";
        const plan = (sub.metadata?.plan as "silver" | "gold") ?? "silver";
        const active = sub.status === "active" || sub.status === "trialing";
        if (userId) {
          await setPlan(userId, active ? plan : "free", {
            status: sub.status,
            stripe_subscription_id: sub.id,
            current_period_end: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id ?? "";
        if (userId) await setPlan(userId, "free", { status: "canceled" });
        break;
      }
      case "account.updated": {
        // stato dell'account Connect del produttore
        const acc = event.data.object as Stripe.Account;
        const userId = acc.metadata?.user_id ?? "";
        if (userId) {
          await admin.from("stripe_accounts").upsert({
            user_id: userId,
            account_id: acc.id,
            charges_enabled: acc.charges_enabled,
            payouts_enabled: acc.payouts_enabled,
            updated_at: new Date().toISOString(),
          });
        }
        break;
      }
    }
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response((e as Error).message, { status: 500 });
  }
});
