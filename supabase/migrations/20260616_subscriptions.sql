-- Abbonamenti BioFido (Stripe).
-- L'entità che paga è l'utente autenticato (auth.users). Il piano effettivo
-- delle sue schede vive in biofido_businesses.plan; questa tabella tiene lo
-- stato dell'abbonamento Stripe ed è la fonte di verità del piano pagato.

create table if not exists public.subscriptions (
  user_id                uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id     text,
  stripe_subscription_id text,
  plan                   text not null default 'free'
                           check (plan in ('free', 'silver', 'gold')),
  -- stato Stripe: active, trialing, past_due, canceled, incomplete...
  status                 text not null default 'inactive',
  current_period_end     timestamptz,
  updated_at             timestamptz default now()
);

alter table public.subscriptions enable row level security;

-- L'utente può leggere SOLO il proprio abbonamento.
create policy "leggi il mio abbonamento"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Nessuna policy di insert/update per gli utenti: scrive solo il webhook,
-- che usa la service-role key e quindi bypassa la RLS. Questo impedisce a un
-- utente di "regalarsi" un piano scrivendo direttamente nella tabella.
