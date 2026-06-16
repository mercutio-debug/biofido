-- Stripe Connect: i produttori incassano i pagamenti delle prenotazioni
-- (destination charge) e BioFido trattiene la commissione (application fee).

-- Account Connect (Express) collegato a ciascun produttore.
create table if not exists public.stripe_accounts (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  account_id      text,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  updated_at      timestamptz default now()
);

alter table public.stripe_accounts enable row level security;

-- Il produttore legge solo il proprio account. Scrive solo il webhook/funzioni
-- (service-role key), così lo stato "abilitato" non è falsificabile dal client.
create policy "stripe account lettura propria"
  on public.stripe_accounts for select
  using (auth.uid() = user_id);

-- Stato del pagamento online della prenotazione (oltre allo stato della
-- richiesta). Il pagamento avviene dopo la conferma del produttore.
alter table public.prenotazioni
  add column if not exists payment_status text not null default 'non_pagata'
    check (payment_status in ('non_pagata', 'pagata', 'rimborsata'));
alter table public.prenotazioni
  add column if not exists stripe_session_id text;
