# 🔔 Notifiche email + push — setup

Quando arriva un **nuovo messaggio** o una **nuova prenotazione**, BioFido avvisa
l'altra parte via **email** (Resend) e via **Web Push** (notifica sul
dispositivo). Sito statico → l'invio gira sulla Edge Function `notify`,
attivata da un **Database Webhook** di Supabase.

Finché non completi questi passi l'app funziona lo stesso: il toggle "Attiva
notifiche push" resta nascosto e nessuna email viene inviata.

## 1. Database

Esegui la migrazione `supabase/migrations/20260619_push_subscriptions.sql`.

## 2. Email (Resend)

1. Crea un account su [resend.com](https://resend.com) e verifica un dominio
   mittente (o usa `onboarding@resend.dev` per i test).
2. Copia la **API key** (`re_...`).

## 3. Chiavi VAPID (Web Push)

Genera la coppia di chiavi (una volta sola):

```bash
npx web-push generate-vapid-keys
```

Ottieni `Public Key` e `Private Key`.

## 4. Segreti della Edge Function

```bash
supabase secrets set \
  RESEND_API_KEY=re_xxx \
  NOTIFY_FROM="BioFido <noreply@tuodominio.it>" \
  VAPID_PUBLIC_KEY=Bxxx \
  VAPID_PRIVATE_KEY=xxx \
  VAPID_SUBJECT="mailto:tu@tuodominio.it" \
  SITE_URL="https://mercutio-debug.github.io/biofido"
```

## 5. Deploy della function

```bash
supabase functions deploy notify --no-verify-jwt
```

## 6. Database Webhooks

In Supabase → **Database → Webhooks**, crea due webhook che puntano alla
function `notify` (HTTP POST), evento **INSERT**:

- tabella `messaggi`
- tabella `prenotazioni`

## 7. Attiva il push nel client

Aggiungi a `.env.local` (e ai secret di GitHub Actions per la produzione) la
chiave **pubblica** VAPID:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=Bxxx
```

Da qui, nella dashboard e in "Le mie prenotazioni" compare il pulsante
**"Attiva le notifiche push"**: l'utente concede il permesso e registra il
dispositivo. Le email partono comunque, anche senza push.

## Note

- Le iscrizioni push scadute vengono rimosse automaticamente (errore 404/410).
- Il service worker è `public/sw.js`.
- I clienti che prenotano da ospite (non loggati) ricevono solo l'email.
