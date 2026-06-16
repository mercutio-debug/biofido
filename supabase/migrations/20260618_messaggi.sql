-- Messaggistica in-app legata a una prenotazione (un thread per prenotazione).
-- Permette al produttore e al cliente (se registrato) di comunicare dentro
-- l'app: conferme, accordi sull'orario, domande. Chi prenota da ospite resta
-- gestito via email.

-- Lega la prenotazione all'account del cliente quando è loggato.
alter table public.prenotazioni
  add column if not exists cliente_user_id uuid references auth.users (id);

-- Il cliente collegato può leggere le proprie prenotazioni.
drop policy if exists "prenotazioni lettura cliente" on public.prenotazioni;
create policy "prenotazioni lettura cliente"
  on public.prenotazioni for select
  using (auth.uid() = cliente_user_id);

create table if not exists public.messaggi (
  id               bigint generated always as identity primary key,
  prenotazione_id  bigint not null references public.prenotazioni (id) on delete cascade,
  mittente         text not null check (mittente in ('azienda', 'cliente')),
  sender_id        uuid references auth.users (id),
  testo            text not null,
  letto            boolean not null default false,
  created_at       timestamptz default now()
);

alter table public.messaggi enable row level security;

-- Leggono e scrivono solo le due parti della prenotazione collegata:
-- il produttore (owner) e il cliente (cliente_user_id).
create policy "messaggi lettura parti"
  on public.messaggi for select using (
    exists (
      select 1 from public.prenotazioni p
      where p.id = prenotazione_id
        and (p.owner = auth.uid() or p.cliente_user_id = auth.uid())
    )
  );
create policy "messaggi invio parti"
  on public.messaggi for insert with check (
    exists (
      select 1 from public.prenotazioni p
      where p.id = prenotazione_id
        and (p.owner = auth.uid() or p.cliente_user_id = auth.uid())
    )
  );
