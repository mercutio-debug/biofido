# ✅ GO-LIVE — checklist unica per attivare BioFido in produzione

Una sola scaletta, in ordine. Spunta man mano. I dettagli sono in
`STRIPE.md` (pagamenti + Connect) e `NOTIFICHE.md` (email + push).

> Finché non completi questi passi l'app **funziona comunque** in modalità demo:
> mappa navigabile, scelte piano salvate in locale, niente pagamenti/notifiche.
>
> Nota: abbiamo scelto **Stripe** (lo scaffold Mollie resta nel repo ma non è usato).

---

## 0. Account da creare (una volta)
- [ ] **Supabase** — progetto già attivo (URL + anon key già in uso).
- [ ] **Stripe** — account (parti in **modalità test**).
- [ ] **Resend** — account per le email.

## 1. Database — esegui le migrazioni (SQL Editor di Supabase, in ordine)
- [ ] `20260615_biofido_businesses.sql`
- [ ] `20260616_subscriptions.sql`
- [ ] `20260617_prenotazioni.sql`
- [ ] `20260618_messaggi.sql`  *(abilita anche il Realtime)*
- [ ] `20260619_push_subscriptions.sql`
- [ ] `20260620_stripe_connect.sql`
- [ ] `20260621_mollie.sql`  *(facoltativa: serve solo se un giorno tornassimo a Mollie)*

## 2. Stripe — prodotti, prezzi, Connect (vedi `STRIPE.md`)
- [ ] Crea 2 prodotti con 2 prezzi ciascuno e copia i 4 `price_id`:
      Silver **9 €/mese** e **90 €/anno**, Gold **24 €/mese** e **240 €/anno**.
- [ ] **Attiva Connect** (Impostazioni → Connect) come piattaforma **Express**.
- [ ] Copia la **chiave segreta** (`sk_test_...`).

## 3. Resend — email (vedi `NOTIFICHE.md`)
- [ ] Verifica un dominio mittente (o usa `onboarding@resend.dev` per i test).
- [ ] **API key** (`re_...`).

## 4. VAPID — chiavi push (una volta)
- [ ] `npx web-push generate-vapid-keys` → annota **Public** e **Private**.

## 5. Secret delle Edge Functions (Supabase → Edge Functions → Secrets)
```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_test_xxx \
  PRICE_SILVER_MONTHLY=price_xxx \
  PRICE_SILVER_ANNUAL=price_xxx \
  PRICE_GOLD_MONTHLY=price_xxx \
  PRICE_GOLD_ANNUAL=price_xxx \
  RESEND_API_KEY=re_xxx \
  NOTIFY_FROM="BioFido <noreply@tuodominio.it>" \
  VAPID_PUBLIC_KEY=Bxxx \
  VAPID_PRIVATE_KEY=xxx \
  VAPID_SUBJECT="mailto:tu@tuodominio.it" \
  SITE_URL="https://mercutio-debug.github.io/biofido"
```
*(`STRIPE_WEBHOOK_SECRET` lo aggiungi al passo 7.)*

## 6. Deploy delle Edge Functions
```bash
supabase functions deploy create-checkout
supabase functions deploy connect-onboard
supabase functions deploy booking-pay
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy notify --no-verify-jwt
```

## 7. Webhook Stripe
- [ ] In Stripe → Sviluppatori → **Webhook**, endpoint:
      `https://<PROGETTO>.supabase.co/functions/v1/stripe-webhook`
- [ ] Eventi: `checkout.session.completed`, `customer.subscription.updated`,
      `customer.subscription.deleted`, `account.updated`.
- [ ] Copia il **Signing secret** e impostalo:
      `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx`

## 8. Database Webhooks (Supabase → Database → Webhooks) → email/push
- [ ] INSERT su `messaggi` → POST a function `notify`
- [ ] INSERT su `prenotazioni` → POST a function `notify`

## 9. Variabili del sito (.env.local e secret di GitHub Actions)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` *(già presenti)*
- [ ] `NEXT_PUBLIC_BILLING_ENABLED=true`  *(accende pagamenti e Connect)*
- [ ] `NEXT_PUBLIC_VAPID_PUBLIC_KEY=Bxxx`  *(accende il toggle push)*
- [ ] Ridistribuisci (push su `main` → GitHub Pages ricompila).

## 10. Collaudo end-to-end (smoke test)
- [ ] Registra un'azienda → **La tua scheda sulla mappa** → compare sulla mappa.
- [ ] Scegli un piano (Silver/Gold) → **Checkout** → torni con piano attivo.
- [ ] **Collega Stripe** (onboarding produttore) → stato "collegato ✅".
- [ ] Crea un'**esperienza**.
- [ ] Da un altro utente (cliente) **prenota** quell'esperienza.
- [ ] Il produttore **conferma** → il cliente riceve **email + push** e il
      **messaggio automatico** in chat (in tempo reale).
- [ ] Il cliente apre **Le mie prenotazioni** → **Paga ora** → pagamento ok →
      stato **Pagata ✅**; nel cruscotto Stripe vedi la fee BioFido.

---

### Passaggio in LIVE (dopo i test)
Ripeti con le chiavi **live** di Stripe (`sk_live_...`, prezzi live, nuovo
webhook + `whsec_...`) e completa l'attivazione **Connect** in live. Email e
VAPID restano gli stessi.
