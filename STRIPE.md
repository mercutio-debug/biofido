# 💳 Pagamenti abbonamenti (Stripe) — setup

BioFido è un sito **statico** (`output: "export"`), quindi non ha un server.
La logica Stripe gira su **Supabase Edge Functions** (Deno): le chiavi segrete
stanno lì, mai nel sito.

```
[Sito statico] → create-checkout (Edge Function) → Stripe Checkout
                                                       │ pagamento
                          biofido_businesses.plan ◄── stripe-webhook ◄── Stripe
```

Finché non completi questi passi, l'app funziona lo stesso: la scelta del piano
viene salvata in locale (flag `NEXT_PUBLIC_BILLING_ENABLED` non impostato).

## 1. Database

Esegui la migrazione `supabase/migrations/20260616_subscriptions.sql`
nell'SQL Editor di Supabase (crea la tabella `subscriptions` con RLS).

## 2. Account e prezzi Stripe

1. Crea un account su [stripe.com](https://stripe.com) (in **Modalità test** va bene).
2. In **Catalogo prodotti** crea 2 prodotti con 2 prezzi ricorrenti ciascuno:
   - **Silver** → mensile **9 €**, annuale **90 €**
   - **Gold** → mensile **24 €**, annuale **240 €**
3. Copia i 4 `price_id` (iniziano con `price_...`).
4. Da **Sviluppatori → Chiavi API** copia la **chiave segreta** (`sk_test_...`).

## 3. Segreti delle Edge Functions

Imposta i segreti (Dashboard Supabase → Edge Functions → Secrets, oppure CLI):

```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_test_xxx \
  PRICE_SILVER_MONTHLY=price_xxx \
  PRICE_SILVER_ANNUAL=price_xxx \
  PRICE_GOLD_MONTHLY=price_xxx \
  PRICE_GOLD_ANNUAL=price_xxx
```

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` sono già disponibili in automatico.

## 4. Deploy delle funzioni

```bash
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook --no-verify-jwt
```

## 5. Webhook

In Stripe → **Sviluppatori → Webhook** aggiungi un endpoint:

```
https://<PROGETTO>.supabase.co/functions/v1/stripe-webhook
```

Eventi da inviare: `checkout.session.completed`,
`customer.subscription.updated`, `customer.subscription.deleted`.
Copia il **Signing secret** (`whsec_...`) e impostalo:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
```

## 6. Attiva nel sito

Aggiungi a `.env.local` (e ai secret di GitHub Actions per la produzione):

```
NEXT_PUBLIC_BILLING_ENABLED=true
```

Da qui il pulsante "Scegli" nella dashboard apre il Checkout Stripe; al
pagamento il webhook imposta il piano sulle schede dell'azienda.

## Commissioni sulle prenotazioni (Stripe Connect)

Il cliente paga una prenotazione **confermata**; il denaro va al produttore
(account Connect) e BioFido trattiene la commissione del piano (destination
charge + application fee). Flusso: il produttore collega Stripe → il cliente
paga dalla pagina "Le mie prenotazioni" → il webhook marca la prenotazione
"pagata".

### Setup

1. **Migrazione**: esegui `supabase/migrations/20260620_stripe_connect.sql`.
2. **Abilita Connect**: in Stripe → *Connect* attiva la piattaforma (tipo
   **Express**). Imposta nome/branding della piattaforma.
3. **Segreti** (oltre a quelli già impostati): serve solo `SITE_URL` (già usato
   dalle notifiche) e la `STRIPE_SECRET_KEY` (già presente).
4. **Deploy** delle funzioni:
   ```bash
   supabase functions deploy connect-onboard
   supabase functions deploy booking-pay
   supabase functions deploy stripe-webhook --no-verify-jwt
   ```
5. **Webhook**: aggiungi all'endpoint `stripe-webhook` gli eventi
   `checkout.session.completed`, `account.updated` (oltre a quelli degli
   abbonamenti).

Con `NEXT_PUBLIC_BILLING_ENABLED=true` compaiono: in dashboard il pulsante
**"Collega Stripe"** (onboarding del produttore) e, in *Le mie prenotazioni*,
**"Paga ora"** sulle prenotazioni confermate.

## Passare in produzione

Ripeti con le chiavi **live** (`sk_live_...`, prezzi live, nuovo webhook con il
relativo `whsec_...`) e completa l'attivazione di Connect in modalità live.
