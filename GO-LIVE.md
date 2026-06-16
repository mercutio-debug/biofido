# ✅ GO-LIVE — checklist unica per attivare BioFido in produzione

Una sola scaletta, in ordine. Spunta man mano. I dettagli sono in
`MOLLIE.md` (pagamenti) e `NOTIFICHE.md` (email + push).

> Finché non completi questi passi l'app **funziona comunque** in modalità demo:
> mappa navigabile, scelte piano salvate in locale, niente pagamenti/notifiche.

---

## 0. Account da creare (una volta)
- [ ] **Supabase** — progetto già attivo (URL + anon key già in uso).
- [ ] **Mollie** — account per i pagamenti (con richiesta **Split payments**).
- [ ] **Resend** — account per le email.

## 1. Database — esegui le migrazioni (SQL Editor di Supabase, in ordine)
- [ ] `20260615_biofido_businesses.sql`
- [ ] `20260616_subscriptions.sql`
- [ ] `20260617_prenotazioni.sql`
- [ ] `20260618_messaggi.sql`  *(abilita anche il Realtime)*
- [ ] `20260619_push_subscriptions.sql`
- [ ] `20260620_stripe_connect.sql`  *(crea campi pagamento/stato; innocua anche con Mollie)*
- [ ] `20260621_mollie.sql`

## 2. Mollie — pagamenti (vedi `MOLLIE.md`)
- [ ] Account Mollie + richiesta **Split payments / routing**.
- [ ] **API key** (`test_...`).
- [ ] **App OAuth**: Redirect URL `…/functions/v1/mollie-connect-callback`,
      annota **Client ID** e **Client secret**.

## 3. Resend — email (vedi `NOTIFICHE.md`)
- [ ] Verifica un dominio mittente (o usa `onboarding@resend.dev` per i test).
- [ ] **API key** (`re_...`).

## 4. VAPID — chiavi push (una volta)
- [ ] `npx web-push generate-vapid-keys` → annota **Public** e **Private**.

## 5. Secret delle Edge Functions (Supabase → Edge Functions → Secrets)
```bash
supabase secrets set \
  MOLLIE_API_KEY=test_xxx \
  MOLLIE_CLIENT_ID=app_xxx \
  MOLLIE_CLIENT_SECRET=xxx \
  RESEND_API_KEY=re_xxx \
  NOTIFY_FROM="BioFido <noreply@tuodominio.it>" \
  VAPID_PUBLIC_KEY=Bxxx \
  VAPID_PRIVATE_KEY=xxx \
  VAPID_SUBJECT="mailto:tu@tuodominio.it" \
  SITE_URL="https://mercutio-debug.github.io/biofido"
```

## 6. Deploy delle Edge Functions
```bash
supabase functions deploy mollie-subscribe
supabase functions deploy mollie-booking-pay
supabase functions deploy mollie-connect-start
supabase functions deploy mollie-connect-callback --no-verify-jwt
supabase functions deploy mollie-webhook --no-verify-jwt
supabase functions deploy notify --no-verify-jwt
```

## 7. Database Webhooks (Supabase → Database → Webhooks) → email/push
- [ ] INSERT su `messaggi` → POST a function `notify`
- [ ] INSERT su `prenotazioni` → POST a function `notify`

*(Mollie non richiede un webhook globale: l'URL è passato a ogni pagamento.)*

## 8. Variabili del sito (.env.local e secret di GitHub Actions)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` *(già presenti)*
- [ ] `NEXT_PUBLIC_BILLING_ENABLED=true`  *(accende pagamenti e collegamento Mollie)*
- [ ] `NEXT_PUBLIC_VAPID_PUBLIC_KEY=Bxxx`  *(accende il toggle push)*
- [ ] Ridistribuisci (push su `main` → GitHub Pages ricompila).

## 9. Collaudo end-to-end (smoke test)
- [ ] Registra un'azienda → **La tua scheda sulla mappa** → compare sulla mappa.
- [ ] Scegli un piano (Silver/Gold) → pagamento Mollie → torni con piano attivo.
- [ ] **Collega Mollie** (il produttore autorizza) → stato "collegato ✅".
- [ ] Crea un'**esperienza**.
- [ ] Da un altro utente (cliente) **prenota** quell'esperienza.
- [ ] Il produttore **conferma** → il cliente riceve **email + push** e il
      **messaggio automatico** in chat (in tempo reale).
- [ ] Il cliente apre **Le mie prenotazioni** → **Paga ora** → pagamento ok →
      stato **Pagata ✅**; nel cruscotto Mollie vedi la commissione trattenuta.

---

### Passaggio in LIVE (dopo i test)
Ripeti con la **API key live** di Mollie e l'app OAuth in live; aggiorna i
secret. Email e VAPID restano gli stessi.
