-- Iscrizioni Web Push dei dispositivi degli utenti (produttori e clienti).
-- Le notifiche vengono inviate dalla Edge Function "notify" su nuovo messaggio
-- o nuova prenotazione.

create table if not exists public.push_subscriptions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz default now()
);

alter table public.push_subscriptions enable row level security;

-- Ogni utente gestisce solo le proprie iscrizioni. La Edge Function legge con
-- la service-role key (bypassa la RLS) per inviare le notifiche.
create policy "push gestione propria"
  on public.push_subscriptions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
