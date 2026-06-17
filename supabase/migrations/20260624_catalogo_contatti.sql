-- Catalogo vendite (funzione GOLD): prodotti e servizi (visite guidate,
-- laboratori didattici, esperienze) con prezzo e immagine. Condiviso tra
-- ECO-VISA e BioFido (chiave owner = user_id). Lettura pubblica: il widget
-- sulla mappa/scheda ne mostra l'anteprima.
create table if not exists public.catalogo (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users (id) on delete cascade,
  numero      int not null default 1,
  nome        text not null,
  tipo        text not null default 'prodotto'
              check (tipo in ('prodotto', 'visita', 'laboratorio', 'esperienza')),
  prezzo      numeric,
  unita       text,
  descrizione text,
  immagine    text,
  created_at  timestamptz not null default now()
);

alter table public.catalogo enable row level security;

create policy "catalogo lettura pubblica"
  on public.catalogo for select using (true);
create policy "catalogo inserimento proprio"
  on public.catalogo for insert with check (auth.uid() = owner);
create policy "catalogo modifica propria"
  on public.catalogo for update using (auth.uid() = owner) with check (auth.uid() = owner);
create policy "catalogo cancellazione propria"
  on public.catalogo for delete using (auth.uid() = owner);

-- Contatti/richieste dai clienti (anche OSPITI: nome + email, senza account).
-- L'azienda legge i propri; l'ospite può inserire. Una copia arriva via email
-- all'azienda (Edge Function notify-contatto, SMTP Aruba — Fase 2).
create table if not exists public.contatti (
  id            uuid primary key default gen_random_uuid(),
  azienda       uuid not null references auth.users (id) on delete cascade,
  nome_cliente  text not null,
  email_cliente text not null,
  tipo_richiesta text not null default 'info'
                check (tipo_richiesta in ('info', 'visita', 'laboratorio', 'esperienza')),
  catalogo_id   uuid references public.catalogo (id) on delete set null,
  messaggio     text,
  portale       text,
  stato         text not null default 'nuovo' check (stato in ('nuovo', 'gestito')),
  created_at    timestamptz not null default now()
);

alter table public.contatti enable row level security;

create policy "contatti azienda lettura"
  on public.contatti for select using (auth.uid() = azienda);
create policy "contatti ospite inserimento"
  on public.contatti for insert with check (true);
create policy "contatti azienda aggiorna"
  on public.contatti for update using (auth.uid() = azienda) with check (auth.uid() = azienda);
