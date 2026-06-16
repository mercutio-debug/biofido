# 💶 Pagamenti con Mollie — setup

BioFido usa **Mollie** per gli abbonamenti delle aziende e per il pagamento
delle prenotazioni con **commissione automatica** (il produttore riceve la sua
quota, BioFido trattiene la fee via *routing*). Sito statico → tutto gira sulle
Edge Functions di Supabase.

> Sostituisce lo scaffold Stripe (le funzioni `create-checkout`, `connect-*`,
> `booking-pay`, `stripe-webhook` non sono più usate).

Finché non completi questi passi l'app funziona in demo (nessun pagamento).

## 1. Database
Esegui `supabase/migrations/20260621_mollie.sql` (oltre alle altre migrazioni).

## 2. Account Mollie + commissione automatica
1. Crea un account su [mollie.com](https://www.mollie.com).
2. Richiedi l'attivazione di **Split payments / routing** (è un modulo da
   compilare: serve per trattenere la commissione e pagare i produttori).
3. Copia la **API key** (Dashboard → Sviluppatori → API keys): `test_...`.

## 3. App OAuth (per collegare i produttori)
In Mollie → **Sviluppatori → Your apps** crea un'app OAuth:
- **Redirect URL**: `https://<PROGETTO>.supabase.co/functions/v1/mollie-connect-callback`
- Annota **Client ID** e **Client secret**.

## 4. Segreti delle Edge Functions
```bash
supabase secrets set \
  MOLLIE_API_KEY=test_xxx \
  MOLLIE_CLIENT_ID=app_xxx \
  MOLLIE_CLIENT_SECRET=xxx \
  SITE_URL="https://mercutio-debug.github.io/biofido"
```

## 5. Deploy delle funzioni
```bash
supabase functions deploy mollie-subscribe
supabase functions deploy mollie-booking-pay
supabase functions deploy mollie-connect-start
supabase functions deploy mollie-connect-callback --no-verify-jwt
supabase functions deploy mollie-webhook --no-verify-jwt
```
> Mollie non richiede di registrare un webhook globale: l'URL viene passato a
> ogni pagamento/sottoscrizione (già fatto dal codice).

## 6. Attiva nel sito
In `.env.local` (e nei secret di GitHub Actions):
```
NEXT_PUBLIC_BILLING_ENABLED=true
```
Da qui compaiono: in dashboard **"Collega Mollie"** (il produttore autorizza il
suo account) e, in *Le mie prenotazioni*, **"Paga ora"**.

## Come funziona
- **Abbonamento**: primo pagamento → mandato → sottoscrizione ricorrente
  (mensile o annuale). Alla conferma il piano si attiva (webhook).
- **Prenotazione**: il cliente paga; la quota del produttore va al suo account
  Mollie (`routing`), BioFido trattiene la commissione del piano.

## Note
- I prezzi dei piani sono in `supabase/functions/_shared/mollie.ts`
  (`PLAN_PRICE`) e devono coincidere con `PLAN_MAP` del frontend.
- I produttori devono completare l'onboarding Mollie per ricevere i fondi.
- Split payments supporta EUR.
