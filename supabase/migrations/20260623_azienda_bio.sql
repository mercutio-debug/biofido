-- Certificazione biologica dell'azienda. Dato CONDIVISO tra ECO-VISA e BioFido
-- (chiave user_id): un'azienda è bio a prescindere dal portale di iscrizione.
--
-- BioFido è riservato alle aziende bio (is_bio sempre true lì); ECO-VISA accetta
-- anche convenzionali. Verifica: nessuna API pubblica gratuita per validare il
-- numero in tempo reale → si raccoglie ente + numero + autocertificazione.

create table if not exists public.azienda_bio (
  user_id               uuid primary key references auth.users (id) on delete cascade,
  is_bio                boolean not null default false,
  ente_certificatore    text,
  numero_certificazione text,
  autocertificato       boolean not null default false,
  updated_at            timestamptz not null default now()
);

alter table public.azienda_bio enable row level security;

create policy "bio lettura propria"
  on public.azienda_bio for select
  using (auth.uid() = user_id);

create policy "bio inserimento proprio"
  on public.azienda_bio for insert
  with check (auth.uid() = user_id);

create policy "bio modifica propria"
  on public.azienda_bio for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
