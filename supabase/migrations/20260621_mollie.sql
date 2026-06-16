-- Mollie come sistema di pagamento (al posto di Stripe): abbonamenti ricorrenti
-- + pagamento prenotazioni con commissione automatica (routing/split).

-- Account Mollie collegati dei produttori (Mollie Connect via OAuth).
-- Conserviamo solo l'id organizzazione (org_...) e lo stato di collegamento:
-- niente token sensibili (lo scambio OAuth avviene al volo nel callback).
create table if not exists public.mollie_accounts (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  org_id      text,
  connected   boolean not null default false,
  oauth_state text,
  updated_at  timestamptz default now()
);

alter table public.mollie_accounts enable row level security;

-- Il produttore vede solo il proprio stato (org_id e connected non sono segreti).
create policy "mollie account lettura propria"
  on public.mollie_accounts for select
  using (auth.uid() = user_id);

-- Riferimenti Mollie per gli abbonamenti (riusa la tabella subscriptions).
alter table public.subscriptions
  add column if not exists mollie_customer_id text;
alter table public.subscriptions
  add column if not exists mollie_subscription_id text;

-- Id del pagamento Mollie sulla prenotazione.
alter table public.prenotazioni
  add column if not exists mollie_payment_id text;
