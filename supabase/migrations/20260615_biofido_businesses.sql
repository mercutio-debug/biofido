-- Tabella base delle attività mostrate sulla mappa BioFido.
-- (Prima era solo nel README: la portiamo tra le migrazioni così la cartella
--  supabase/migrations è autosufficiente.) Idempotente.

create table if not exists public.biofido_businesses (
  id          bigint generated always as identity primary key,
  owner       uuid references auth.users (id),
  name        text not null,
  category    text not null check (category in ('agricola', 'negozio', 'ristorante', 'artigiano')),
  plan        text not null default 'free' check (plan in ('free', 'silver', 'gold')),
  lat         double precision not null,
  lon         double precision not null,
  city        text not null,
  address     text,
  description text,
  website     text,
  phone       text,
  products    jsonb,
  created_at  timestamptz default now()
);

alter table public.biofido_businesses enable row level security;

-- Lettura pubblica: la mappa è visibile a tutti.
drop policy if exists "lettura pubblica" on public.biofido_businesses;
create policy "lettura pubblica"
  on public.biofido_businesses for select using (true);

-- Ogni azienda gestisce solo la propria scheda.
drop policy if exists "modifica propria" on public.biofido_businesses;
create policy "modifica propria"
  on public.biofido_businesses for all
  using (auth.uid() = owner) with check (auth.uid() = owner);
