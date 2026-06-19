-- Statistiche di visita delle schede BioFido.
-- Ogni visita a una scheda pubblica = una riga. L'owner legge solo le sue.

create table if not exists public.biofido_visite (
  id bigserial primary key,
  owner uuid not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_biofido_visite_owner_created
  on public.biofido_visite (owner, created_at);

alter table public.biofido_visite enable row level security;

-- chiunque (anche non loggato) può registrare una visita
drop policy if exists "visite_insert_any" on public.biofido_visite;
create policy "visite_insert_any" on public.biofido_visite
  for insert to anon, authenticated with check (true);

-- l'azienda legge solo le proprie visite
drop policy if exists "visite_select_own" on public.biofido_visite;
create policy "visite_select_own" on public.biofido_visite
  for select to authenticated using (auth.uid() = owner);

grant insert on public.biofido_visite to anon, authenticated;
grant select on public.biofido_visite to authenticated;
grant usage, select on sequence public.biofido_visite_id_seq to anon, authenticated;
